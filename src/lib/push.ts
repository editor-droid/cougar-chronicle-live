import webpush from 'web-push';
import prisma from './prisma';

export type PushTopic = 'news' | 'faith' | 'opinion' | 'videos' | 'breaking';

export async function sendPushNotification(
  title: string,
  message: string,
  url: string,
  options?: { topics?: PushTopic[] }
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys are missing. Push notifications disabled.');
    return;
  }

  try {
    webpush.setVapidDetails(
      'mailto:contact@thecougarchronicle.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const topics = options?.topics;
    const where: any = {};
    if (topics?.length) {
      // Match if any requested topic is enabled on the device
      where.OR = topics.map((t) => {
        if (t === 'news') return { wantsNews: true };
        if (t === 'faith') return { wantsFaith: true };
        if (t === 'opinion') return { wantsOpinion: true };
        if (t === 'videos') return { wantsVideos: true };
        if (t === 'breaking') return { wantsBreaking: true };
        return {};
      });
    }

    const subscriptions = await prisma.pushSubscription.findMany({ where });

    const payload = JSON.stringify({ title, message, url });

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          },
          payload
        );
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error('Error sending push notification:', error);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error fetching subscriptions or broadcasting push:', error);
  }
}

export function topicsForPost(post: {
  category?: string;
  format?: string;
  isBreaking?: boolean;
  isAmerica250?: boolean;
}): PushTopic[] {
  const topics: PushTopic[] = [];
  if (post.isBreaking) topics.push('breaking');
  if (post.isAmerica250) topics.push('opinion');
  const format = (post.format || 'news').toLowerCase();
  const cat = (post.category || 'news').toLowerCase();
  if (format === 'opinion') topics.push('opinion');
  else if (cat === 'faith') topics.push('faith');
  else topics.push('news'); // news, politics, family, print-edition reportage
  return topics;
}

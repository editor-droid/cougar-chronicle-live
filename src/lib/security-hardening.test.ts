import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isCronAuthorized } from './cron-auth';
import {
  CHAT_MAX_INPUT_CHARS,
  chatMayUseArticlePath,
  isPublicChatArticle,
  publicChatArticleWhere,
} from './chat-guard';
import { newPasswordError } from './passwords';
import { getClientIp, rateLimit, rateLimitKeyCount } from './rate-limit';
import { canEditLibraryVideo, publicRegistrationRole } from './roles';
import { planStaffUpload, staffCanUpload } from './upload-policy';

describe('public registration role', () => {
  it('always creates a reader, including when purpose asks for staff', () => {
    assert.equal(publicRegistrationRole(undefined), 'USER');
    assert.equal(publicRegistrationRole('reader'), 'USER');
    assert.equal(publicRegistrationRole('writer'), 'USER');
    assert.equal(publicRegistrationRole('WRITER'), 'USER');
    assert.equal(publicRegistrationRole('ADMIN'), 'USER');
  });
});

describe('new passwords', () => {
  it('requires 8 characters and does not describe a login check', () => {
    assert.match(newPasswordError('short') || '', /at least 8/);
    assert.equal(newPasswordError('longenough'), null);
    assert.match(newPasswordError(6) || '', /at least 8/);
  });
});

describe('library videos', () => {
  it('lets editors and admins edit videos and keeps writers out', () => {
    assert.equal(canEditLibraryVideo('ADMIN'), true);
    assert.equal(canEditLibraryVideo('EDITOR'), true);
    assert.equal(canEditLibraryVideo('WRITER'), false);
    assert.equal(canEditLibraryVideo('USER'), false);
    assert.equal(canEditLibraryVideo(undefined), false);
  });
});

describe('staff uploads', () => {
  it('allows writer and above, and rejects readers', () => {
    assert.equal(staffCanUpload('WRITER'), true);
    assert.equal(staffCanUpload('EDITOR'), true);
    assert.equal(staffCanUpload('ADMIN'), true);
    assert.equal(staffCanUpload('USER'), false);
    assert.equal(staffCanUpload(null), false);
  });

  it('allowlists editor image and pdf types and rejects everything else', () => {
    const png = planStaffUpload({
      filename: 'photo.png',
      contentType: 'image/png',
      size: 1200,
      now: 10,
      nonce: 'abc',
    });
    assert.equal(png.ok, true);
    if (!png.ok) return;
    assert.equal(png.upload.contentType, 'image/png');
    assert.equal(png.upload.contentLength, 1200);
    assert.equal(png.upload.key, 'uploads/10-abc-photo.png');

    const pdf = planStaffUpload({
      filename: 'edition.pdf',
      contentType: 'application/pdf',
      size: 50_000,
      now: 11,
      nonce: 'def',
    });
    assert.equal(pdf.ok, true);
    if (!pdf.ok) return;
    assert.equal(pdf.upload.contentType, 'application/pdf');
    assert.equal(pdf.upload.key, 'uploads/11-def-edition.pdf');

    assert.equal(
      planStaffUpload({ filename: 'x.svg', contentType: 'image/svg+xml', size: 100 }).ok,
      false
    );
    assert.equal(
      planStaffUpload({ filename: 'clip.mp4', contentType: 'video/mp4', size: 100 }).ok,
      false
    );
    assert.equal(
      planStaffUpload({ filename: 'x.bin', contentType: 'application/octet-stream', size: 100 }).ok,
      false
    );
    const jpeg = planStaffUpload({
      filename: 'a.jpg',
      contentType: 'image/jpeg; charset=binary',
      size: 10,
      now: 1,
      nonce: 'n',
    });
    assert.equal(jpeg.ok, true);
  });

  it('rejects missing or oversized files and strips path tricks from the key', () => {
    assert.equal(planStaffUpload({ filename: 'a.png', contentType: 'image/png', size: 0 }).ok, false);
    assert.equal(
      planStaffUpload({ filename: 'a.png', contentType: 'image/png', size: 25 * 1024 * 1024 + 1 }).ok,
      false
    );
    const sneaky = planStaffUpload({
      filename: '../../etc/passwd.png',
      contentType: 'image/png',
      size: 20,
      now: 5,
      nonce: 'zz',
    });
    assert.equal(sneaky.ok, true);
    if (!sneaky.ok) return;
    assert.equal(sneaky.upload.key.includes('..'), false);
    assert.equal(sneaky.upload.key.includes('/etc'), false);
    assert.match(sneaky.upload.key, /^uploads\/5-zz-[a-z0-9_-]+\.png$/i);
  });
});

describe('cron auth', () => {
  it('fails closed when the secret is missing or the bearer token does not match', () => {
    assert.equal(isCronAuthorized('Bearer secret', undefined), false);
    assert.equal(isCronAuthorized('Bearer secret', ''), false);
    assert.equal(isCronAuthorized(null, 'secret'), false);
    assert.equal(isCronAuthorized('secret', 'secret'), false);
    assert.equal(isCronAuthorized('Bearer wrong', 'secret'), false);
    assert.equal(isCronAuthorized('Bearer secret', 'secret'), true);
  });
});

describe('public chat context', () => {
  it('drops premium and print articles and caps the input constant', () => {
    assert.equal(publicChatArticleWhere.isPremium, false);
    assert.equal(publicChatArticleWhere.printEditionId, null);
    assert.equal(publicChatArticleWhere.state, 'PUBLISHED');
    assert.equal(
      isPublicChatArticle({ state: 'PUBLISHED', isPremium: false, printEditionId: null }),
      true
    );
    assert.equal(
      isPublicChatArticle({ state: 'PUBLISHED', isPremium: true, printEditionId: null }),
      false
    );
    assert.equal(
      isPublicChatArticle({ state: 'PUBLISHED', isPremium: false, printEditionId: 'print_1' }),
      false
    );
    assert.equal(chatMayUseArticlePath('/article/campus-story'), true);
    assert.equal(chatMayUseArticlePath('/premium-article/members-only'), false);
    assert.equal(chatMayUseArticlePath('/print-edition/volume-1'), false);
    assert.equal(CHAT_MAX_INPUT_CHARS, 4000);
  });
});

describe('rate limit client ip and pruning', () => {
  it('prefers cf-connecting-ip, then the first forwarded hop', () => {
    const headers = new Headers({
      'cf-connecting-ip': '1.1.1.1',
      'x-forwarded-for': '9.9.9.9, 8.8.8.8',
      'x-real-ip': '7.7.7.7',
    });
    assert.equal(getClientIp({ headers }), '1.1.1.1');
    assert.equal(
      getClientIp({ headers: new Headers({ 'x-forwarded-for': ' 9.9.9.9 , 8.8.8.8' }) }),
      '9.9.9.9'
    );
    assert.equal(getClientIp({ headers: new Headers({ 'x-real-ip': '7.7.7.7' }) }), '7.7.7.7');
    assert.equal(getClientIp(undefined), 'unknown');
  });

  it('drops expired keys instead of keeping them forever', () => {
    const before = rateLimitKeyCount();
    rateLimit('prune-expired-key', 5, -10);
    assert.equal(rateLimitKeyCount(), before + 1);
    rateLimit('prune-live-key', 5, 60_000);
    assert.equal(rateLimitKeyCount(), before + 1);
    const again = rateLimit('prune-live-key', 5, 60_000);
    assert.equal(again.success, true);
    assert.equal(again.remaining, 3);
  });
});

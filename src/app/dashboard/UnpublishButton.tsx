'use client';

import { useFormStatus } from 'react-dom';
import { updatePostState } from './actions';

function UnpublishSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="dash-btn dash-btn-danger" disabled={pending}>
      {pending ? 'Unpublishing…' : 'Unpublish'}
    </button>
  );
}

export default function UnpublishButton({ postId }: { postId: string }) {
  return (
    <form
      action={updatePostState}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          'Unpublish this story? It leaves the site and returns to Drafts. The publish date is cleared until you publish it again.'
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="newState" value="DRAFT" />
      <UnpublishSubmit />
    </form>
  );
}

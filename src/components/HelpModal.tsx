import { Modal } from './Modal';

/** The example on the help card. Its Book must never be a Puzzle (the unit tests check). */
export const HELP_EXAMPLE = { clue: 'Boy refuses to grow up.', title: 'Peter Pan' };

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal title="How to play" open={open} onClose={onClose}>
      <p>Guess today’s famous book from summaries exactly five words long.</p>
      <ul className="rules">
        <li>The first clue is deliberately unhelpful.</li>
        <li>Every wrong guess pulls a more helpful clue off the shelf. You can skip to the next clue instead, but a skip uses up a try.</li>
        <li>You have six tries. The fifth clue usually names the characters; the last names the author.</li>
        <li>A leading “The” is optional.</li>
      </ul>
      <div className="example">
        <span className="callno">e.g.</span>
        {HELP_EXAMPLE.clue}
      </div>
      <p className="example-answer">That’s {HELP_EXAMPLE.title}.</p>
      <p className="modal-footnote">Everyone gets the same book each day. A new one arrives at midnight, your time.</p>
      <button className="button button-primary" type="button" onClick={onClose} data-autofocus>
        Start reading
      </button>
    </Modal>
  );
}

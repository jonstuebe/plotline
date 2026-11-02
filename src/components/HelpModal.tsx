import { Modal } from './Modal';

/** The example on the help sheet. Its Book must never be a Puzzle (the unit tests check). */
export const HELP_EXAMPLE = { clue: 'Boy refuses to grow up.', title: 'Peter Pan' };

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal title="How to Play" open={open} onClose={onClose}>
      <p className="lead">Guess today’s famous book and movie from summaries exactly five words long.</p>
      <ul className="group rules">
        <li>The first clue is deliberately unhelpful.</li>
        <li>Each wrong guess reveals a more helpful clue. Skip reveals one too, but uses up a try.</li>
        <li>You have six tries. The fifth clue usually names the characters; the last names the author or director.</li>
        <li>A leading “The” is optional.</li>
      </ul>
      <div className="group example">
        <p className="example-clue">{HELP_EXAMPLE.clue}</p>
        <p className="example-answer">That’s {HELP_EXAMPLE.title}.</p>
      </div>
      <p className="footnote">Everyone gets the same book and movie each day. New ones arrive at midnight, your time.</p>
      <button className="btn btn-tint btn-wide" type="button" onClick={onClose} data-autofocus>
        Start Playing
      </button>
    </Modal>
  );
}

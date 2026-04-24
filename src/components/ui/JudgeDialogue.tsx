import { JUDGE_EMOJI, JUDGE_NAME } from '../../constants/judge'

interface JudgeDialogueProps {
  text: string
}

export function JudgeDialogue({ text }: JudgeDialogueProps) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.015)',
        borderLeft: '3px solid rgba(243,156,18,.4)',
        borderRight: '1px solid rgba(255,255,255,.06)',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        padding: '8px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        animation: 'judgeIn .3s ease-out',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{JUDGE_EMOJI}</span>
      <div>
        <span style={{ color: '#f39c12', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{JUDGE_NAME}: </span>
        <span style={{ color: '#718096', fontSize: 12, fontStyle: 'italic' }}>"{text}"</span>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import ScriptGenerator from './ScriptGenerator'
import IdeaGenerator from './IdeaGenerator'
import VoiceoverGenerator from './VoiceoverGenerator'
import type { PlanName } from '@/lib/plans'

type Tab = 'script' | 'ideas' | 'voiceover'

interface Props {
  plan: PlanName
  voiceoverUsed: number
  voiceoverLimit: number
}

export default function AIToolsPage({ plan, voiceoverUsed, voiceoverLimit }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('script')
  const [pendingVoiceoverText, setPendingVoiceoverText] = useState('')
  const [pendingScriptTopic, setPendingScriptTopic] = useState('')

  function handleSendToVoiceover(script: string) {
    setPendingVoiceoverText(script)
    setActiveTab('voiceover')
  }

  function handleUseIdea(title: string) {
    setPendingScriptTopic(title)
    setActiveTab('script')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'script', label: 'Script Generator' },
    { id: 'ideas', label: 'Idea Generator' },
    { id: 'voiceover', label: 'Voiceover AI' },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>AI Tools</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          Generate scripts, get video ideas, and create voiceovers with AI.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#A855F7' : 'rgba(255,255,255,0.5)',
              borderBottom: activeTab === tab.id ? '2px solid #A855F7' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'script' && (
        <ScriptGenerator
          plan={plan}
          initialTopic={pendingScriptTopic}
          onTopicUsed={() => setPendingScriptTopic('')}
          onSendToVoiceover={handleSendToVoiceover}
        />
      )}
      {activeTab === 'ideas' && (
        <IdeaGenerator plan={plan} onUseIdea={handleUseIdea} />
      )}
      {activeTab === 'voiceover' && (
        <VoiceoverGenerator
          plan={plan}
          voiceoverUsed={voiceoverUsed}
          voiceoverLimit={voiceoverLimit}
          initialText={pendingVoiceoverText}
          onTextUsed={() => setPendingVoiceoverText('')}
        />
      )}
    </div>
  )
}

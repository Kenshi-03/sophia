import React from 'react'
import MemoryCard, { MemoryNodeItem } from './memory-card'

interface MemoryTimelineProps {
  nodes?: MemoryNodeItem[]
}

const defaultNodes: MemoryNodeItem[] = [
  {
    id: '1',
    content: 'Parenthesis in NextJS routes e.g. (dashboard) acts as route grouping. Omit from actual pathname.',
    category: 'Research',
    tags: ['web-dev', 'nextjs', 'routing'],
    createdAt: 'May 24, 2026',
  },
  {
    id: '2',
    content: 'Academic lecture scheduled in Room 302 focuses on higher cognitive computing logs.',
    category: 'Academics',
    tags: ['calendar', 'schedule', 'academics'],
    createdAt: 'May 23, 2026',
  },
]

export default function MemoryTimeline({ nodes = defaultNodes }: MemoryTimelineProps) {
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <MemoryCard key={node.id} node={node} />
      ))}
    </div>
  )
}

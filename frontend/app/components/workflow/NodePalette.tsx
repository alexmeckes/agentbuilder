'use client'

import { useState, DragEvent } from 'react'
import { Search, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { NODE_CATEGORIES, NodeTemplate, getNodeTemplate } from '../../types/NodeTypes'

interface NodePaletteProps {
  className?: string
}

export default function NodePalette({ className = '' }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['ai-agents']))
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Filter nodes based on search term
  const filteredCategories = NODE_CATEGORIES.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0)

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const onDragStart = (event: DragEvent<HTMLDivElement>, templateId: string) => {
    event.dataTransfer.setData('application/reactflow', templateId)
    event.dataTransfer.effectAllowed = 'move'
    
    // Set custom drag image
    const template = getNodeTemplate(templateId)
    if (template) {
      event.dataTransfer.setData('application/template', JSON.stringify(template))
    }
  }

  return (
    <div className={`w-80 h-full bg-white border-r border-slate-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Node Palette</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No nodes found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="mb-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-lg">{category.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-slate-900">{category.name}</h3>
                    <p className="text-xs text-slate-600">{category.description}</p>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    {category.nodes.length}
                  </span>
                </button>

                {/* Category Nodes */}
                {expandedCategories.has(category.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {category.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="group relative"
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <div
                          className="p-3 border border-slate-200 rounded-lg cursor-move hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 bg-white"
                          draggable
                          onDragStart={(e) => onDragStart(e, node.id)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg flex-shrink-0">{node.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-900 truncate">
                                {node.name}
                              </h4>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                {node.description}
                              </p>
                              
                              {/* Node Type Badge */}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  node.type === 'agent' ? 'bg-blue-100 text-blue-700' :
                                  node.type === 'tool' ? 'bg-green-100 text-green-700' :
                                  node.type === 'input' ? 'bg-purple-100 text-purple-700' :
                                  node.type === 'output' ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {node.type}
                                </span>
                                
                                {/* Configurable indicator */}
                                {node.configurable.length > 0 && (
                                  <span className="text-xs text-slate-500">
                                    {node.configurable.length} configurable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hover Tooltip */}
                        {hoveredNode === node.id && (
                          <div className="absolute left-full top-0 ml-2 z-50 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg">
                            <h4 className="font-medium text-slate-900 mb-2">{node.name}</h4>
                            <p className="text-sm text-slate-600 mb-3">{node.description}</p>
                            
                            {/* Default Configuration Preview */}
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                Default Configuration:
                              </h5>
                              <div className="space-y-1">
                                {node.type === 'agent' && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Model:</span>
                                    <span className="text-slate-900 font-mono">
                                      {node.defaultData.model_id}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-600">Name:</span>
                                  <span className="text-slate-900 font-mono">
                                    {node.defaultData.name}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Configurable Fields */}
                              {node.configurable.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <h5 className="text-xs font-medium text-slate-700 mb-1">
                                    Configurable Fields:
                                  </h5>
                                  <div className="flex flex-wrap gap-1">
                                    {node.configurable.map((field) => (
                                      <span 
                                        key={field}
                                        className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded"
                                      >
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-600 text-center">
          <p>💡 <strong>Tip:</strong> Drag nodes to the canvas to add them</p>
          <p className="mt-1">Double-click nodes after adding to configure</p>
        </div>
      </div>
    </div>
  )
} 
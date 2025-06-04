# Changelog

## [v1.2.0] - 2025-01-15

### 🎨 Enhanced Workflow Navigation

#### ✨ New Features
- **Extended Zoom Range**: Zoom out to 10% (vs 50% default) for complete workflow overview
- **Enhanced Zoom In**: Zoom in to 500% (vs 200% default) for detailed editing
- **Intuitive Panning**: Drag-to-pan on background for smooth workflow navigation
- **Optimized Scroll Behavior**: Mouse wheel exclusively controls zoom level

#### 🔧 Technical Improvements
- **ReactFlow Configuration**: Updated `minZoom={0.1}` and `maxZoom={5}` for better range
- **Panning Controls**: Enabled `panOnDrag={true}` for background dragging
- **Scroll Optimization**: Disabled `panOnScroll={false}` to prevent zoom conflicts
- **Consistent Behavior**: Maintained `zoomOnScroll={true}` for standard zoom experience

#### 🎯 User Experience Enhancements
- **Large Workflow Support**: Better handling of complex workflows with many nodes
- **Precision Editing**: Enhanced detail work at high zoom levels
- **Smooth Navigation**: Improved responsiveness during pan and zoom operations
- **Cross-Platform Compatibility**: Consistent behavior across desktop and laptop trackpads

#### 📚 Documentation Updates
- **README.md**: Added navigation improvements to features and recent updates
- **USER_INTERFACE_GUIDE.md**: Comprehensive guide for new navigation controls
- **Technical Details**: Added implementation notes with code examples

#### 🔄 Migration Notes
- No breaking changes - existing workflows maintain full compatibility
- Navigation improvements are immediately available to all users
- Previous zoom and pan behaviors are enhanced, not replaced

---

## Previous Versions

*For earlier version history, see Git commit history.* 
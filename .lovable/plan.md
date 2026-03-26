

## Plan: Improve Table View Layout

### Problem
The header area has too many buttons crammed into a single row, causing overflow. The action buttons (AI generation, selection, publish toggle, view toggle) all compete for horizontal space.

### Changes

**`src/components/document/DocumentsTableView.tsx`**

1. **Restructure the header into multiple rows:**
   - **Row 1**: Title + badges (left) and Publish All toggle + Edit Individual button (right)
   - **Row 2** (toolbar, shown when documents are selected): Selection-based action buttons wrapped in a distinct toolbar bar with background, allowing them to wrap naturally

2. **Make the table container full-width**: Remove the outer `space-y-6` padding constraints and ensure the table stretches to fill available width with `w-full` on the container.

3. **Wrap action buttons**: Use `flex-wrap` on the bulk action buttons row so they wrap to a second line on smaller viewports instead of overflowing.

### Layout Structure
```text
┌─────────────────────────────────────────────────────────┐
│ All Documents  [3 need attention] [5 selected]          │
│                          Publish All [toggle] [Edit Individual] │
├─────────────────────────────────────────────────────────┤
│ ▸ Toolbar (only when selected):                         │
│   [Select Needing Attention] [Excerpts] [Categories]    │
│   [Schemes] [Tags] [Generate All]                       │
├─────────────────────────────────────────────────────────┤
│ TABLE (full width)                                      │
└─────────────────────────────────────────────────────────┘
```

### Technical Detail
- Split lines 194-340 into two sections: header row and a conditional toolbar `div`
- Toolbar uses `flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md` for visual grouping
- Keep all existing button logic unchanged, just reorganize the layout hierarchy


# Document Management Testing Instructions

## 🧪 Manual Testing Guide

### Prerequisites
1. Ensure all services are running:
   ```bash
   docker-compose up -d
   docker-compose ps  # Verify all services are healthy
   ```

2. Verify you can access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/health

### Test Scenario 1: Document List and View Mode
1. **Navigate to Document List**
   - Go to http://localhost:3000/documents
   - Verify documents are displayed in the table
   - Check that document types, titles, and metadata show correctly

2. **Test View Mode Navigation**
   - Click the "查看" (eye icon) button on any Markdown document
   - Verify the URL changes to `/documents/{id}` (without /edit)
   - Confirm the document opens in read-only mode:
     - ✅ Content is not editable
     - ✅ Toolbar shows "查看模式" button
     - ✅ No editing tools are visible
     - ✅ "编辑" button is available in the header

### Test Scenario 2: Edit Mode
1. **Enter Edit Mode from View**
   - From view mode, click the "编辑" button
   - Verify URL changes to `/documents/{id}/edit`
   - Confirm full editing interface is available:
     - ✅ Content is editable
     - ✅ Full toolbar with formatting options
     - ✅ Image/PDF upload buttons work
     - ✅ Auto-save indicator appears

2. **Direct Edit Mode Navigation**
   - From document list, click "编辑" button
   - Should go directly to edit mode

### Test Scenario 3: Document Creation
1. **Start Creation Flow**
   - Click "新建文档" button
   - Verify URL is `/documents/new`
   - Should show association selection step

2. **Complete Creation**
   - Select document association (personal/project)
   - Choose document type (Markdown)
   - Verify creation flow completes properly

### Test Scenario 4: URL Navigation
Test these URLs directly in the browser:
- http://localhost:3000/documents/1 → Should open view mode
- http://localhost:3000/documents/1/edit → Should open edit mode  
- http://localhost:3000/documents/new → Should open creation flow
- http://localhost:3000/documents → Should show document list

### Test Scenario 5: Error Handling
1. **Invalid Document ID**
   - Try http://localhost:3000/documents/999999
   - Should show error message and handle gracefully

2. **Non-existent Route**
   - Try http://localhost:3000/documents/invalid
   - Should handle route parsing errors properly

## 🔍 What to Look For

### ✅ Success Indicators
- URLs match expected patterns
- Mode detection works correctly (view vs edit)
- UI elements appear/disappear appropriately
- No console errors in browser dev tools
- Smooth transitions between modes
- Proper breadcrumb navigation

### ❌ Potential Issues
- Documents not loading (check API connectivity)
- Wrong mode being displayed
- Console errors or warnings
- UI elements not responding
- Routing not working as expected

## 📊 Browser Testing

Test in multiple browsers:
- Chrome/Edge (Chromium-based)
- Firefox
- Safari (if on macOS)

Check for:
- Consistent behavior across browsers
- No browser-specific UI issues
- Proper responsive design
- Keyboard navigation works

## 🐛 Debugging Tips

If issues are found:

1. **Check Browser Console**
   - Open F12 dev tools
   - Look for JavaScript errors
   - Check network tab for failed API calls

2. **Verify Backend Logs**
   ```bash
   docker-compose logs backend --tail=50
   ```

3. **Check Database Content**
   ```bash
   docker-compose exec db psql -U user -d main_db -c "SELECT id, title, type FROM documents LIMIT 5;"
   ```

4. **Restart Services if Needed**
   ```bash
   docker-compose restart frontend backend
   ```

## 📝 Test Report Template

Use this template to document test results:

```
## Test Session Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Local/Staging/Production]

### Test Results
- [ ] Document list loads correctly
- [ ] View mode navigation works
- [ ] Edit mode navigation works  
- [ ] Document creation works
- [ ] URL routing works correctly
- [ ] Error handling is appropriate

### Issues Found
1. [Issue description]
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:
   - Severity: [High/Medium/Low]

### Overall Assessment
[Pass/Fail with notes]
```

## 🎯 Acceptance Criteria

The implementation is considered fully successful when:
- All test scenarios pass without issues
- No critical console errors
- User experience is smooth and intuitive
- All documented features work as specified
- Performance is acceptable (< 3 second load times)

Happy testing! The document management system should now work flawlessly. 🚀
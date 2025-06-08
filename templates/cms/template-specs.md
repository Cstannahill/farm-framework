# 5. CMS Template (`--template cms`)

**Description:** Content management system with rich text editing and media management.

**Additional Structure:**

```plaintext
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── editor/
│   │       │   │   ├── RichTextEditor.tsx
│   │       │   │   ├── MediaUploader.tsx
│   │       │   │   └── ContentPreview.tsx
│   │       │   ├── content/
│   │       │   │   ├── ContentList.tsx
│   │       │   │   ├── ContentCard.tsx
│   │       │   │   └── ContentForm.tsx
│   │       │   └── admin/
│   │       │       ├── AdminDashboard.tsx
│   │       │       ├── UserManager.tsx
│   │       │       └── RoleManager.tsx
│   │       └── stores/
│   │           ├── contentStore.ts
│   │           ├── mediaStore.ts
│   │           └── adminStore.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── content.py
│       │   │   ├── media.py
│       │   │   ├── admin.py
│       │   │   └── pages.py
│       │   ├── models/
│       │   │   ├── content.py
│       │   │   ├── page.py
│       │   │   ├── media.py
│       │   │   └── category.py
│       │   ├── storage/
│       │   │   ├── __init__.py
│       │   │   ├── local.py
│       │   │   └── cloud.py
│       │   └── cms/
│       │       ├── __init__.py
│       │       ├── publishing.py
│       │       └── workflow.py
│       └── uploads/
│           ├── images/
│           ├── documents/
│           └── .gitkeep
```

**Additional Dependencies:**

- **Frontend:** Rich text editor (TipTap/Slate), file upload components
- **Backend:** File handling libraries, image processing, cloud storage SDKs

---

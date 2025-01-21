import { Route, Routes } from 'react-router-dom';
import { NoteTemplatesPage } from './NoteTemplatesPage';
import { TemplateEditorPage } from './TemplateEditorPage';

export function TemplateRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="" element={<NoteTemplatesPage />} />
      <Route path="new" element={<TemplateEditorPage />} />
      <Route path="edit/:id" element={<TemplateEditorPage />} />
    </Routes>
  );
} 
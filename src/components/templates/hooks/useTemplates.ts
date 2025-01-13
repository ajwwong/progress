import { useState, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { NoteTemplate } from '../types';

export function useTemplates() {
  const medplum = useMedplum();
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    try {
      const results = await medplum.searchResources('Basic', 'code=note-template');
      const loadedTemplates = results.map(r => ({
        id: r.id || '',
        name: r.extension?.find(e => e.url === 'name')?.valueString || '',
        type: (r.extension?.find(e => e.url === 'type')?.valueString as NoteTemplate['type']) || 'progress',
        sections: r.extension?.find(e => e.url === 'sections')?.valueString 
          ? JSON.parse(r.extension.find(e => e.url === 'sections')?.valueString || '[]')
          : []
      }));
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: NoteTemplate) => {
    try {
      const templateResource = {
        resourceType: 'Basic',
        code: {
          coding: [{
            system: 'http://example.org/note-templates',
            code: 'note-template'
          }]
        },
        extension: [
          {
            url: 'name',
            valueString: template.name
          },
          {
            url: 'type',
            valueString: template.type
          },
          {
            url: 'sections',
            valueString: JSON.stringify(template.sections)
          }
        ]
      };

      if (template.id) {
        await medplum.updateResource({ ...templateResource, id: template.id });
      } else {
        await medplum.createResource(templateResource);
      }

      await loadTemplates();
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      return false;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await medplum.deleteResource('Basic', templateId);
      await loadTemplates();
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    refresh: loadTemplates
  };
}
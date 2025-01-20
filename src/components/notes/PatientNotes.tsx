import { useState, useRef, useEffect } from 'react';
import { Paper, Stack, Group, Text, Button, Badge, ActionIcon, Menu, Loader, Box, Tooltip, Textarea, Modal, Title } from '@mantine/core';
import { IconPlus, IconDots, IconTrash, IconCheck, IconWand, IconCopy, IconEdit, IconEye, IconCalendar } from '@tabler/icons-react';
import { Patient } from '@medplum/fhirtypes';
import { usePatientNotes } from '../../hooks/usePatientNotes';
import { notifications } from '@mantine/notifications';
import { useMedplum } from '@medplum/react';
import { format } from 'date-fns';

interface PatientNotesProps {
  patient: Patient;
}

const getSectionStyle = (theme: any) => ({
  borderLeft: `3px solid ${theme.colors.blue[3]}`,
  paddingLeft: theme.spacing.md
});

export function PatientNotes({ patient }: PatientNotesProps): JSX.Element {
  const medplum = useMedplum();
  const { notes, isLoading, error, createNote, updateNote, deleteNote } = usePatientNotes(patient);
  const [editedSections, setEditedSections] = useState<{ [key: string]: string }>({});
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [justCopied, setJustCopied] = useState<string>('');
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicInstructions, setMagicInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingSection, setEditingSection] = useState<{noteId: string, sectionTitle: string} | null>(null);
  const [viewingSection, setViewingSection] = useState<string | null>(null);
  const [contentHeights, setContentHeights] = useState<{ [key: string]: number }>({});

  const handleTextChange = (sectionTitle: string, newText: string) => {
    setEditedSections(prev => ({
      ...prev,
      [sectionTitle]: newText
    }));
    setModifiedSections(prev => {
      const next = new Set(prev);
      next.add(sectionTitle);
      return next;
    });
  };

  const handleSaveSection = async (noteId: string, sectionTitle: string) => {
    try {
      setIsActionLoading(true);
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const updatedSections = note.sections.map(section => 
        section.title === sectionTitle
          ? { ...section, content: editedSections[sectionTitle] }
          : section
      );

      await updateNote(noteId, { sections: updatedSections });
      setModifiedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionTitle);
        return next;
      });

      notifications.show({
        title: 'Success',
        message: 'Section updated successfully',
        color: 'green'
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save changes',
        color: 'red'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCopySection = (text: string, sectionTitle: string) => {
    navigator.clipboard.writeText(text);
    setJustCopied(sectionTitle);
    setTimeout(() => setJustCopied(''), 2000);
  };

  const handleMagicEdit = async () => {
    if (!editingSection || editingSection.sectionTitle !== 'Psychotherapy Note') return;
    
    setIsProcessing(true);
    try {
      const currentNote = editedSections['Psychotherapy Note'];
      const transcript = editedSections['Transcript'];
      const prompt = `As an experienced psychodynamically-oriented therapist, please adjust the following psychotherapy note according to these instructions:

${magicInstructions}

Current note:
${currentNote}

Original transcript for reference:
${transcript}

Please provide the complete adjusted note while maintaining the same professional therapeutic style and structure.`;

      const response = await medplum.executeBot(
        '5731008c-42a6-4fdc-8969-2560667b4f1d',
        { text: prompt },
        'application/json'
      );

      if (response.text) {
        handleTextChange(editingSection.sectionTitle, response.text);
        setShowMagicModal(false);
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to process magic edit',
        color: 'red'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Paper withBorder p="xl">
        <Stack align="center">
          <Loader />
          <Text size="sm" c="dimmed">Loading notes...</Text>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper withBorder p="xl">
        <Text c="red" size="sm">Error loading notes: {error.message}</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {notes.length === 0 || !notes.some(note => note.sections?.some(section => section.content?.trim())) ? (
        <Paper withBorder p="xl">
          <Text c="dimmed" ta="center">There are no items for {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family} in the selected time period.</Text>
        </Paper>
      ) : (
        notes
          .filter(note => note.sections?.some(section => section.content?.trim()))
          .map((note) => (
            <Paper key={note.id} withBorder p="md" radius="md">
              <Stack gap="md">
                <Box>
                  {note.sections
                    .filter(section => section.content?.trim())
                    .map((section, index) => {
                      const sectionId = `${note.id}-${section.title}`;
                      const isExpanded = expandedSection === sectionId;

                      return (
                        <Box 
                          key={index} 
                          mb="md"
                          style={{
                            borderLeft: '3px solid var(--mantine-color-blue-3)',
                            paddingLeft: 'var(--mantine-spacing-md)',
                            cursor: 'pointer',
                            transition: 'all 200ms ease'
                          }}
                          onClick={() => {
                            if (section.title === 'Psychotherapy Note') {
                              setExpandedSection(isExpanded ? null : sectionId);
                              setViewingSection(isExpanded ? null : sectionId);
                            }
                          }}
                        >
                          <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                              <Text fw={600} size="sm" style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 4,
                                color: 'var(--mantine-color-blue-8)',
                                fontSize: 'var(--mantine-font-size-sm)'
                              }}>
                                <IconCalendar size={14} />
                                {format(new Date(note.date), 'MMM d')}
                                <Text span size="xs" c="dimmed" ml={4}>
                                  {format(new Date(note.date), 'h:mm a')}
                                </Text>
                              </Text>
                              <Text fw={500} size="sm" c="dimmed">
                                {section.title}
                              </Text>
                            </Group>
                            <Group gap={8}>
                              {section.title === 'Psychotherapy Note' && isExpanded && (
                                <Tooltip label="Magic Edit">
                                  <ActionIcon
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSection({ noteId: note.id || '', sectionTitle: section.title });
                                      setShowMagicModal(true);
                                    }}
                                    variant="light"
                                    color="violet"
                                    size="sm"
                                  >
                                    <IconWand size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <Tooltip label="Edit">
                                <ActionIcon
                                  size="sm"
                                  variant="light"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSection(isExpanded ? null : sectionId);
                                    setViewingSection(null);
                                    if (!editedSections[section.title]) {
                                      setEditedSections(prev => ({
                                        ...prev,
                                        [section.title]: section.content
                                      }));
                                    }
                                  }}
                                >
                                  <IconEdit size={14} />
                                </ActionIcon>
                              </Tooltip>
                              {isExpanded && !viewingSection && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    modifiedSections.has(section.title) 
                                      ? handleSaveSection(note.id, section.title)
                                      : handleCopySection(section.content, section.title);
                                  }}
                                  variant={modifiedSections.has(section.title) ? "filled" : "light"}
                                  color={modifiedSections.has(section.title) ? "blue" : justCopied === section.title ? "teal" : "violet"}
                                  size="sm"
                                  leftSection={
                                    modifiedSections.has(section.title) 
                                      ? <IconCheck size={16} /> 
                                      : justCopied === section.title 
                                        ? <IconCheck size={16} /> 
                                        : <IconCopy size={16} />
                                  }
                                >
                                  {modifiedSections.has(section.title) 
                                    ? 'Save Changes' 
                                    : justCopied === section.title 
                                      ? 'Copied!' 
                                      : 'Copy Text'}
                                </Button>
                              )}
                            </Group>
                          </Group>
                          
                          <div style={{
                            overflow: 'hidden',
                            transition: 'max-height 300ms ease-in-out, opacity 200ms ease-in-out',
                            maxHeight: isExpanded ? '2000px' : '200px',
                            opacity: isExpanded ? 1 : 0.9
                          }}>
                            {isExpanded ? (
                              viewingSection === sectionId ? (
                                <Text 
                                  size="sm" 
                                  style={{ 
                                    whiteSpace: 'pre-wrap',
                                    backgroundColor: 'var(--mantine-color-gray-0)',
                                    padding: 'var(--mantine-spacing-md)',
                                    borderRadius: 'var(--mantine-radius-sm)'
                                  }}
                                >
                                  {section.content}
                                </Text>
                              ) : (
                                <>
                                  <Box mb={8}>
                                    <Text size="sm" color="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <IconEdit size={14} />
                                      Click inside to edit
                                    </Text>
                                  </Box>
                                  <Textarea
                                    value={editedSections[section.title] || section.content}
                                    onChange={(e) => handleTextChange(section.title, e.currentTarget.value)}
                                    minRows={5}
                                    autosize
                                    onClick={(e) => e.stopPropagation()}
                                    styles={(theme) => ({
                                      input: {
                                        backgroundColor: theme.white,
                                        border: `1px solid ${theme.colors.gray[2]}`,
                                        transition: 'all 200ms ease',
                                        '&:hover': {
                                          borderColor: theme.colors.blue[2],
                                          backgroundColor: theme.colors.gray[0],
                                        },
                                        '&:focus': {
                                          borderColor: theme.colors.blue[5],
                                          backgroundColor: theme.white,
                                        },
                                      },
                                    })}
                                  />
                                </>
                              )
                            ) : (
                              <Text 
                                ref={(el) => {
                                  if (el) {
                                    const sectionKey = `${note.id}-${section.title}`;
                                    if (!contentHeights[sectionKey]) {
                                      setContentHeights(prev => ({
                                        ...prev,
                                        [sectionKey]: el.scrollHeight
                                      }));
                                    }
                                  }
                                }}
                                size="sm" 
                                style={{ 
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '200px',
                                  overflow: 'hidden',
                                  position: 'relative'
                                }}
                              >
                                {section.content}
                                {contentHeights[`${note.id}-${section.title}`] > 200 && (
                                  <div 
                                    style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      height: '50px',
                                      background: 'linear-gradient(transparent 0%, white)'
                                    }}
                                  />
                                )}
                              </Text>
                            )}
                          </div>
                        </Box>
                      );
                    })}
                </Box>
              </Stack>
            </Paper>
          ))
      )}

      {/* Magic Edit Modal */}
      <Modal
        opened={showMagicModal}
        onClose={() => setShowMagicModal(false)}
        title={<Title order={3}>Magic Edit - Psychotherapy Note</Title>}
        size="lg"
      >
        <Stack gap="md">
          <Textarea
            label="Edit Instructions"
            description="Describe how you want to modify the note"
            placeholder="e.g., 'Expand on the client's attachment patterns' or 'Add more detail about treatment progress'"
            value={magicInstructions}
            onChange={(e) => setMagicInstructions(e.currentTarget.value)}
            minRows={3}
            autosize
            styles={(theme) => ({
              input: {
                backgroundColor: theme.colors.gray[0]
              }
            })}
          />
          <Group justify="flex-end">
            <Button 
              onClick={() => setShowMagicModal(false)}
              variant="subtle"
              color="gray"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMagicEdit}
              loading={isProcessing}
              color="violet"
            >
              Apply Magic Edit
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
} 
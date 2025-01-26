import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Paper, Stack, Group, Text, Button, Badge, ActionIcon, Menu, Loader, Box, Tooltip, Textarea, Title } from '@mantine/core';
import { IconPlus, IconDots, IconTrash, IconCheck, IconWand, IconCopy, IconEdit, IconEye, IconCalendar, IconLock, IconBook } from '@tabler/icons-react';
import { Patient, Composition } from '@medplum/fhirtypes';
import { usePatientNotes, Note, NoteSection } from '../../hooks/usePatientNotes';
import { notifications } from '@mantine/notifications';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MagicEditModal } from './MagicEditModal';
import { usePatientInfo } from '../../hooks/usePatientInfo';

interface PatientNotesProps {
  patient: Patient;
}

const getSectionStyle = (theme: any): { borderLeft: string; paddingLeft: string | number } => ({
  borderLeft: `3px solid ${theme.colors.blue[3]}`,
  paddingLeft: theme.spacing.md
});

const AUTOSAVE_DELAY = 2000;

export function PatientNotes({ patient }: PatientNotesProps): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const { notes, isLoading, error, createNote, updateNote, deleteNote } = usePatientNotes(patient);
  const { formData: patientInfo } = usePatientInfo(patient);
  const [editedSections, setEditedSections] = useState<{ [key: string]: string }>({});
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editModeNotes, setEditModeNotes] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [justCopied, setJustCopied] = useState<string>('');
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [editingSection, setEditingSection] = useState<{noteId: string, sectionTitle: string} | null>(null);
  const [contentHeights, setContentHeights] = useState<{ [key: string]: number }>({});
  const [hiddenTranscripts, setHiddenTranscripts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const [autosaveTimer, setAutosaveTimer] = useState<NodeJS.Timeout>();
  const [currentEditingNote, setCurrentEditingNote] = useState<string | null>(null);
  
  // Add a ref to store the current note content
  const notesRef = useRef<Note[]>(notes);
  notesRef.current = notes;

  // Initialize transcripts as hidden when notes load
  useEffect(() => {
    if (notes.length > 0) {
      const notesWithTranscripts = notes.filter(note => 
        note.sections?.some(section => 
          section.title.toLowerCase().includes('transcript')
        )
      );
      
      setHiddenTranscripts(new Set(notesWithTranscripts.map(note => note.id)));
    }
  }, [notes]);

  // Group notes by year - memoize this computation
  const notesByYear = useMemo(() => 
    notes
      .filter(note => note.sections?.some(section => section.content?.trim()))
      .reduce((acc, note) => {
        const year = new Date(note.date).getFullYear();
        if (!acc[year]) {
          acc[year] = [];
        }
        acc[year].push(note);
        return acc;
      }, {} as { [key: number]: Note[] })
  , [notes]);

  // Sort years in descending order - memoize this computation
  const sortedYears = useMemo(() => 
    Object.keys(notesByYear)
      .map(Number)
      .sort((a, b) => b - a)
  , [notesByYear]);

  const handleTextChange = useCallback((noteId: string, sectionTitle: string, newText: string) => {
    setEditedSections(prev => ({
      ...prev,
      [sectionTitle]: newText
    }));
    setModifiedSections(prev => {
      const next = new Set(prev);
      next.add(sectionTitle);
      return next;
    });

    setCurrentEditingNote(noteId);
  }, []);

  // Remove autosave-related code
  useEffect(() => {
    return () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
    };
  }, [autosaveTimer]);

  const handleSaveSection = async (noteId: string, sectionTitle: string) => {
    try {
      setIsActionLoading(true);
      const note = notesRef.current.find(n => n.id === noteId);
      if (!note) return;

      const updatedSections = note.sections.map(section => 
        section.title === sectionTitle
          ? { ...section, content: editedSections[sectionTitle] }
          : section
      );

      await updateNote(noteId, { sections: updatedSections });

      // Update the local state without triggering a full re-render
      const updatedNote = { ...note, sections: updatedSections };
      notesRef.current = notesRef.current.map(n => 
        n.id === noteId ? updatedNote : n
      );
      
      // Clear the modified state for this section
      setModifiedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionTitle);
        return next;
      });

      // Update the editedSections to reflect the saved content
      setEditedSections(prev => {
        const next = { ...prev };
        delete next[sectionTitle];
        return next;
      });

      notifications.show({
        title: 'Success',
        message: 'Section updated successfully',
        color: 'green',
        autoClose: 2000
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

  const handleStartRecording = () => {
    navigate('/audio', { 
      state: { 
        selectedPatient: patient,
        defaultTemplate: patientInfo.defaultTemplate 
      } 
    });
  };

  const handleSignNote = async (note: Note) => {
    try {
      // First read the current composition
      const composition = await medplum.readResource('Composition', note.id);
      
      // Update the composition with new status and attester
      const updatedComposition: Composition = {
        ...composition,
        status: 'final',
        attester: [{
          mode: 'legal',
          time: new Date().toISOString(),
          party: {
            reference: `Practitioner/${profile?.id}`
          }
        }]
      };

      // Update the composition
      await medplum.updateResource(updatedComposition);
      
      // Update the local note state
      await updateNote(note.id, { status: 'final' });

      notifications.show({
        title: 'Note Signed',
        message: 'The note has been signed and finalized',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to sign note',
        color: 'red'
      });
    }
  };

  const handleUnlock = async (note: Note) => {
    try {
      // First read the current composition
      const composition = await medplum.readResource('Composition', note.id);
      
      // Update the composition with new status and remove attester
      const updatedComposition: Composition = {
        ...composition,
        status: 'preliminary',
        attester: undefined
      };

      // Update the composition
      await medplum.updateResource(updatedComposition);
      
      // Update the local note state
      await updateNote(note.id, { status: 'preliminary' });

      notifications.show({
        title: 'Note Unlocked',
        message: 'The note has been unlocked for editing',
        color: 'blue'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to unlock note',
        color: 'red'
      });
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
      <Paper 
        withBorder 
        p="md" 
        radius="md"
        style={{
          borderTop: '3px solid var(--mantine-color-blue-4)',
          backgroundColor: 'var(--mantine-color-gray-0)'
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Title 
              order={3} 
              style={{
                fontFamily: 'var(--mantine-font-family)',
                color: 'var(--mantine-color-blue-8)',
                letterSpacing: '-0.3px'
              }}
            >
              Clinical Notes
            </Title>
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
              Therapeutic Progress Documentation
            </Text>
          </Group>
          <Button
            leftSection={<IconPlus size={16} style={{ strokeWidth: 2.5 }} />}
            onClick={handleStartRecording}
            loading={isActionLoading}
            variant="light"
            color="blue"
            size="sm"
            styles={(theme) => ({
              root: {
                transition: 'all 200ms ease',
                '&:hover': {
                  backgroundColor: theme.colors.blue[1],
                  transform: 'translateY(-1px)'
                }
              }
            })}
          >
            Create New Note
          </Button>
        </Group>
      </Paper>

      {isLoading ? (
        <Paper withBorder p="xl">
          <Loader />
        </Paper>
      ) : error ? (
        <Paper withBorder p="xl">
          <Text c="red">{error}</Text>
        </Paper>
      ) : notes.length === 0 ? (
        <Paper withBorder p="xl">
          <Text c="dimmed" ta="center">There are no items for {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family} in the selected time period.</Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {sortedYears.map(year => (
            <Box key={year}>
              <Group 
                justify="apart" 
                style={{ 
                  borderBottom: '2px solid var(--mantine-color-gray-3)',
                  marginBottom: 'var(--mantine-spacing-md)',
                  paddingBottom: 'var(--mantine-spacing-xs)'
                }}
              >
                <Text fw={700} size="lg" c="dimmed">{year}</Text>
              </Group>
              <Stack gap="md">
                {notesByYear[year].map((note) => {
                  const isNoteExpanded = expandedNotes.has(note.id);
                  const allContent = note.sections
                    .filter(section => section.content?.trim())
                    .map(section => isNoteExpanded ? `${section.title}\n${section.content}` : section.content)
                    .join('\n\n');
                  const lines = allContent.split('\n');
                  const shouldShowReadMore = lines.length > 5;
                  const displayContent = isNoteExpanded ? allContent : lines.slice(0, 5).join('\n');

                  return (
                    <Paper 
                      key={note.id} 
                      withBorder 
                      p="md" 
                      radius="md"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        // Don't collapse if text is being selected
                        if (window.getSelection()?.toString()) {
                          return;
                        }
                        
                        setExpandedNotes(prev => {
                          const next = new Set(prev);
                          if (next.has(note.id)) {
                            next.delete(note.id);
                            // If this note was in edit mode, exit edit mode
                            if (editModeNotes === note.id) {
                              setEditModeNotes(null);
                              setEditedSections({});
                            }
                          } else {
                            next.add(note.id);
                          }
                          return next;
                        });
                      }}
                    >
                      <Stack gap="md">
                        <Group justify="space-between">
                          <Group gap="xs" style={{ flex: 1 }}>
                            <Text fw={600} size="sm" style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 4,
                              color: 'var(--mantine-color-blue-8)',
                              fontSize: 'var(--mantine-font-size-sm)'
                            }}>
                              <IconCalendar size={14} />
                              <Text span size="xs" c="dimmed" ml={4}>
                                {format(new Date(note.date), 'h:mm a')}
                              </Text>
                            </Text>
                            <Text fw={600} size="md" c="dimmed">
                              {note.title || 'Untitled Note'}
                            </Text>
                            <Text c="dimmed" size="sm">
                              {format(new Date(note.date), 'MMM d, yyyy')}
                            </Text>
                            {note.status === 'preliminary' ? (
                              <Tooltip
                                label="Disclaimer: This is an AI-generated document. Clinician validation and editing is necessary before use."
                                multiline
                                maw={300}
                                position="top"
                                withArrow
                              >
                                <Badge 
                                  size="md" 
                                  variant="light" 
                                  color="yellow"
                                  leftSection={<IconEdit size={12} style={{ strokeWidth: 2.5 }} />}
                                  styles={(theme) => ({
                                    root: {
                                      textTransform: 'none',
                                      fontWeight: 500
                                    }
                                  })}
                                >
                                  Draft
                                </Badge>
                              </Tooltip>
                            ) : (
                              <Badge 
                                size="md" 
                                variant="light" 
                                color="gray"
                                leftSection={<IconLock size={12} style={{ strokeWidth: 2.5 }} />}
                                styles={(theme) => ({
                                  root: {
                                    textTransform: 'none',
                                    fontWeight: 500
                                  }
                                })}
                              >
                                Signed
                              </Badge>
                            )}
                            <Tooltip label={note.status === 'final' ? "Note is locked" : "Edit Note"}>
                              <ActionIcon
                                size="sm"
                                variant="light"
                                color="blue"
                                disabled={note.status === 'final'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (editModeNotes === note.id) {
                                    setEditModeNotes(null);
                                    setEditedSections({});
                                  } else {
                                    // Clear any existing edits and set new edit mode
                                    setEditedSections({});
                                    setEditModeNotes(note.id);
                                    setExpandedNotes(prev => {
                                      const next = new Set(prev);
                                      next.add(note.id);
                                      return next;
                                    });
                                  }
                                }}
                                styles={(theme) => ({
                                  root: {
                                    '&[data-disabled]': {
                                      backgroundColor: theme.colors.gray[1],
                                      color: theme.colors.gray[5],
                                      cursor: 'not-allowed'
                                    }
                                  }
                                })}
                              >
                                <IconEdit size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                          {note.status === 'final' ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlock(note);
                              }}
                              variant="subtle"
                              color="gray"
                              size="xs"
                              leftSection={<IconLock size={14} style={{ strokeWidth: 2 }} />}
                              styles={(theme) => ({
                                root: {
                                  transition: 'all 200ms ease',
                                  '&:hover': {
                                    backgroundColor: theme.colors.gray[1],
                                    transform: 'translateY(-1px)'
                                  }
                                }
                              })}
                            >
                              Unlock
                            </Button>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSignNote(note);
                              }}
                              variant="subtle"
                              color="blue"
                              size="xs"
                              leftSection={<IconBook size={14} style={{ strokeWidth: 2 }} />}
                              styles={(theme) => ({
                                root: {
                                  transition: 'all 200ms ease',
                                  '&:hover': {
                                    backgroundColor: theme.colors.blue[0],
                                    transform: 'translateY(-1px)'
                                  }
                                }
                              })}
                            >
                              Sign
                            </Button>
                          )}
                        </Group>
                        <Box>
                          <div style={{
                            position: 'relative',
                            overflow: 'hidden',
                            maxHeight: isNoteExpanded ? 'none' : '120px'
                          }}>
                            {!isNoteExpanded ? (
                              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                {displayContent}
                              </Text>
                            ) : editModeNotes === note.id ? (
                              <Stack gap="md">
                                {note.sections
                                  .filter(section => section.content?.trim())
                                  .map((section, index) => {
                                    const isTranscript = section.title.toLowerCase().includes('transcript');
                                    const isTranscriptHidden = hiddenTranscripts.has(note.id);

                                    // Handle transcript visibility
                                    if (isTranscript && isTranscriptHidden) {
                                      return (
                                        <Text
                                          key={index}
                                          size="sm"
                                          fw={500}
                                          c="blue"
                                          style={{ cursor: 'pointer' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHiddenTranscripts(prev => {
                                              const next = new Set(prev);
                                              next.delete(note.id);
                                              return next;
                                            });
                                          }}
                                        >
                                          Show Transcript
                                        </Text>
                                      );
                                    }

                                    return (
                                      <Box key={index}>
                                        <Group justify="apart" mb={6}>
                                          <Text fw={500} size="sm" c="blue.7">
                                            {section.title}
                                          </Text>
                                          <Group gap={8}>
                                            {section.title !== 'Transcript' && (
                                              <Tooltip label="Magic Edit">
                                                <ActionIcon
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSection({ noteId: note.id || '', sectionTitle: section.title });
                                                    setShowMagicModal(true);
                                                  }}
                                                  variant="light"
                                                  color="blue"
                                                  size="sm"
                                                >
                                                  <IconWand size={14} />
                                                </ActionIcon>
                                              </Tooltip>
                                            )}
                                            <Button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                modifiedSections.has(section.title) 
                                                  ? handleSaveSection(note.id, section.title)
                                                  : handleCopySection(section.content, section.title);
                                              }}
                                              variant={modifiedSections.has(section.title) ? "filled" : "light"}
                                              color={modifiedSections.has(section.title) ? "blue" : justCopied === section.title ? "teal" : "blue"}
                                              size="xs"
                                              leftSection={
                                                modifiedSections.has(section.title) 
                                                  ? <IconCheck size={14} /> 
                                                  : justCopied === section.title 
                                                    ? <IconCheck size={14} /> 
                                                    : <IconCopy size={14} />
                                              }
                                            >
                                              {modifiedSections.has(section.title) 
                                                ? 'Save Changes' 
                                                : justCopied === section.title 
                                                  ? 'Copied!' 
                                                  : 'Copy Text'}
                                            </Button>
                                            {isTranscript && (
                                              <Button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setHiddenTranscripts(prev => {
                                                    const next = new Set(prev);
                                                    next.add(note.id);
                                                    return next;
                                                  });
                                                }}
                                                variant="subtle"
                                                size="xs"
                                              >
                                                Hide Transcript
                                              </Button>
                                            )}
                                          </Group>
                                        </Group>
                                        <Textarea
                                          value={editedSections[section.title] || section.content}
                                          onChange={(e) => handleTextChange(note.id, section.title, e.target.value)}
                                          minRows={3}
                                          autosize
                                          readOnly={!editModeNotes}
                                          onClick={(e) => e.stopPropagation()}
                                          styles={(theme) => ({
                                            root: {
                                              // Ensure the textarea container doesn't interfere with hover effects
                                              '&:hover .mantine-Textarea-input': {
                                                borderColor: theme.colors.blue[4],
                                                boxShadow: `0 0 0 1px ${theme.colors.blue[1]}`,
                                                backgroundColor: theme.colors.gray[0],
                                              }
                                            },
                                            input: {
                                              backgroundColor: theme.white,
                                              border: `1px solid ${theme.colors.gray[2]}`,
                                              transition: 'all 200ms ease',
                                              '&:hover': {
                                                borderColor: theme.colors.blue[4],
                                                boxShadow: `0 0 0 1px ${theme.colors.blue[1]}`,
                                                backgroundColor: theme.colors.gray[0],
                                              },
                                              '&:focus': {
                                                borderColor: theme.colors.blue[5],
                                                boxShadow: `0 0 0 2px ${theme.colors.blue[1]}`,
                                                backgroundColor: theme.white,
                                              },
                                              '&:focus-within': {
                                                borderColor: theme.colors.blue[5],
                                                boxShadow: `0 0 0 2px ${theme.colors.blue[1]}`,
                                                backgroundColor: theme.white,
                                              }
                                            },
                                          })}
                                        />
                                      </Box>
                                    );
                                  })
                                }
                              </Stack>
                            ) : (
                              <Stack gap="md">
                                {note.sections
                                  .filter(section => section.content?.trim())
                                  .map((section, index) => {
                                    const isTranscript = section.title.toLowerCase().includes('transcript');
                                    const isTranscriptHidden = hiddenTranscripts.has(note.id);

                                    // Handle transcript visibility
                                    if (isTranscript && isTranscriptHidden) {
                                      return (
                                        <Text
                                          key={index}
                                          size="sm"
                                          fw={500}
                                          c="blue"
                                          style={{ cursor: 'pointer' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHiddenTranscripts(prev => {
                                              const next = new Set(prev);
                                              next.delete(note.id);
                                              return next;
                                            });
                                          }}
                                        >
                                          Show Transcript
                                        </Text>
                                      );
                                    }

                                    return (
                                      <Box key={index}>
                                        <Text 
                                          fw={500} 
                                          size="sm" 
                                          c="blue.7" 
                                          mb={6}
                                          style={{
                                            borderBottom: '1px solid var(--mantine-color-blue-2)',
                                            paddingBottom: '4px',
                                          }}
                                        >
                                          <Group justify="space-between" align="center">
                                            {section.title}
                                            {isTranscript && (
                                              <Button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setHiddenTranscripts(prev => {
                                                    const next = new Set(prev);
                                                    next.add(note.id);
                                                    return next;
                                                  });
                                                }}
                                                variant="subtle"
                                                size="xs"
                                              >
                                                Hide Transcript
                                              </Button>
                                            )}
                                          </Group>
                                        </Text>
                                        <Text 
                                          size="sm" 
                                          style={{ 
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.6
                                          }}
                                        >
                                          {section.content}
                                        </Text>
                                      </Box>
                                    );
                                  })
                                }
                              </Stack>
                            )}
                            {!isNoteExpanded && shouldShowReadMore && (
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '50px',
                                background: 'linear-gradient(transparent, white)'
                              }} />
                            )}
                          </div>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <MagicEditModal
        opened={showMagicModal}
        onClose={() => setShowMagicModal(false)}
        onEdit={(editedText) => {
          if (editingSection) {
            handleTextChange(editingSection.noteId, editingSection.sectionTitle, editedText);
          }
        }}
        currentContent={
          editingSection 
            ? (editedSections[editingSection.sectionTitle] || 
               notes.find(n => n.id === editingSection.noteId)?.sections.find(s => s.title === editingSection.sectionTitle)?.content || 
               '')
            : ''
        }
        transcriptContent={
          editingSection
            ? notes.find(n => n.id === editingSection.noteId)?.sections.find(s => 
                s.title.toLowerCase().includes('transcript') || 
                s.title === 'Session Transcript'
              )?.content
            : undefined
        }
        sectionTitle={editingSection?.sectionTitle || ''}
      />
    </Stack>
  );
} 
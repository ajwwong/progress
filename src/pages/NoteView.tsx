import { Composition } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Box, Container, Text, Title, Textarea, Button, Group, Modal } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IconWand } from '@tabler/icons-react';

export function NoteView(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [composition, setComposition] = useState<Composition>();
  const [error, setError] = useState<string>();
  const [editedSections, setEditedSections] = useState<{ [key: string]: string }>({});
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicInstructions, setMagicInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      medplum.readResource('Composition', id)
        .then(comp => {
          const authorRef = comp.author?.[0]?.reference;
          const profileRef = `Practitioner/${profile?.id}`;
          
          if (authorRef === profileRef) {
            setComposition(comp);
            const sections: { [key: string]: string } = {};
            comp.section?.forEach((section) => {
              sections[section.title || ''] = section.text?.div?.replace(/<[^>]*>/g, '') || '';
            });
            setEditedSections(sections);
          } else {
            setError('You do not have permission to view this composition');
          }
        })
        .catch(err => setError('Error loading composition'));
    }
  }, [medplum, id, profile]);

  const handleSaveSection = async (sectionTitle: string) => {
    if (!composition) return;

    const updatedComposition = {
      ...composition,
      section: composition.section?.map(section => {
        if (section.title === sectionTitle) {
          return {
            ...section,
            text: {
              div: editedSections[sectionTitle],
              status: 'generated'
            }
          };
        }
        return section;
      })
    };

    try {
      await medplum.updateResource(updatedComposition);
      setComposition(updatedComposition);
      setModifiedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionTitle);
        return next;
      });
    } catch (err) {
      setError('Error saving changes');
    }
  };

  const handleCopySection = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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

  const handleMagicEdit = async (sectionTitle: string) => {
    if (!composition || sectionTitle !== 'Psychotherapy Note') return;
    
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
        handleTextChange(sectionTitle, response.text);
        setShowMagicModal(false);
      }
    } catch (err) {
      setError('Error processing magic edit');
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <Container size="sm" mt="xl">
        <Box p="xl">
          <Title order={1} color="red">{error}</Title>
        </Box>
      </Container>
    );
  }

  return (
    <Container size="sm" mt="xl">
      <Box p="xl">
        <Title order={1} mb="xl">Session Notes - {new Date(composition?.date || '').toLocaleString()}</Title>
        
        {composition?.section?.map((section, index) => (
          <Box key={index} mt="xl">
            <Group position="apart" mb="md">
              <Title order={2} size="h4">
                {section.title}
              </Title>
              <Group spacing="xs">
                {section.title === 'Psychotherapy Note' && (
                  <Button
                    onClick={() => setShowMagicModal(true)}
                    color="violet"
                    leftIcon={<IconWand size={16} />}
                  >
                    Magic Edit
                  </Button>
                )}
                <Button
                  onClick={() => 
                    modifiedSections.has(section.title || '') 
                      ? handleSaveSection(section.title || '')
                      : handleCopySection(editedSections[section.title || ''])
                  }
                  color={modifiedSections.has(section.title || '') ? "blue" : "gray"}
                >
                  {modifiedSections.has(section.title || '') ? 'Save' : 'Copy Section'}
                </Button>
              </Group>
            </Group>
            <Textarea
              value={editedSections[section.title || '']}
              onChange={(e) => handleTextChange(section.title || '', e.currentTarget.value)}
              minRows={5}
              autosize
            />
          </Box>
        ))}

        <Modal
          opened={showMagicModal}
          onClose={() => setShowMagicModal(false)}
          title="Magic Edit - Psychotherapy Note"
          size="lg"
        >
          <Box>
            <Textarea
              label="Edit Instructions"
              description="Describe how you want to modify the note"
              placeholder="e.g., 'Expand on the client's attachment patterns' or 'Add more detail about treatment progress'"
              value={magicInstructions}
              onChange={(e) => setMagicInstructions(e.currentTarget.value)}
              minRows={3}
              mb="md"
            />
            <Group position="right">
              <Button 
                onClick={() => setShowMagicModal(false)}
                variant="subtle"
                color="gray"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleMagicEdit('Psychotherapy Note')}
                loading={isProcessing}
                color="violet"
              >
                Apply Magic Edit
              </Button>
            </Group>
          </Box>
        </Modal>
      </Box>
    </Container>
  );
}

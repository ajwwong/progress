import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Grid,
  ThemeIcon,
  Accordion,
  Badge,
  Card,
  Avatar,
  ActionIcon,
  Menu
} from '@mantine/core';
import {
  Search,
  Book,
  HelpCircle,
  MessageCircle,
  Video,
  FileText,
  ChevronRight,
  Mail,
  Phone,
  ExternalLink,
  PlayCircle,
  BookOpen,
  MessageSquare,
  Clock,
  MoreHorizontal,
  Plus
} from 'lucide-react';

const quickLinks = [
  {
    title: 'Getting Started Guide',
    description: 'Learn the basics of using TherapistPro',
    icon: Book,
    color: 'blue'
  },
  {
    title: 'Video Tutorials',
    description: 'Watch step-by-step tutorial videos',
    icon: Video,
    color: 'green'
  },
  {
    title: 'Documentation',
    description: 'Browse detailed feature documentation',
    icon: FileText,
    color: 'violet'
  },
  {
    title: 'Community Forum',
    description: 'Connect with other therapists',
    icon: MessageCircle,
    color: 'orange'
  }
];

const faqs = [
  {
    question: 'How do I schedule recurring appointments?',
    answer: 'To schedule recurring appointments, create a new appointment and check the "Recurring" option. You can then set the frequency and duration of the recurring series.'
  },
  {
    question: 'How do I set up online payments?',
    answer: 'Go to Billing Settings and click "Set Up Payments". You can then connect your Stripe account or add other payment methods.'
  },
  {
    question: 'Can I customize appointment reminders?',
    answer: 'Yes, you can customize appointment reminders in Settings > Notifications. You can set the timing and content of reminders.'
  },
  {
    question: 'How do I share documents with clients?',
    answer: 'Use the Documents section to upload and share files. You can set permissions and track when clients view them.'
  }
];

const supportArticles = [
  {
    title: 'Calendar Management Tips',
    category: 'Guides',
    readTime: '5 min read'
  },
  {
    title: 'Setting Up Client Portal',
    category: 'Setup',
    readTime: '8 min read'
  },
  {
    title: 'Billing Best Practices',
    category: 'Billing',
    readTime: '6 min read'
  }
];

export function HelpSupport() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Help & Support</Title>
            <Text c="dimmed">Find answers and get assistance with TherapistPro</Text>
          </Stack>
          <Button leftSection={<Plus size={16} />}>New Support Ticket</Button>
        </Group>

        {/* Search Section */}
        <Paper withBorder p="xl" radius="md">
          <Stack gap="lg" align="center">
            <Stack gap="xs" align="center" style={{ maxWidth: 600 }}>
              <Title order={3}>How can we help you?</Title>
              <Text c="dimmed" ta="center">
                Search our knowledge base or browse popular topics below
              </Text>
            </Stack>
            <TextInput
              placeholder="Search for help articles, tutorials, and more..."
              leftSection={<Search size={16} />}
              size="md"
              style={{ width: '100%', maxWidth: 600 }}
            />
          </Stack>
        </Paper>

        {/* Quick Links */}
        <Grid>
          {quickLinks.map((link) => (
            <Grid.Col key={link.title} span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder p="md" radius="md">
                <Stack gap="md">
                  <ThemeIcon size="lg" radius="md" color={link.color} variant="light">
                    <link.icon size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>{link.title}</Text>
                    <Text size="sm" c="dimmed">{link.description}</Text>
                  </div>
                  <Button 
                    variant="light" 
                    color={link.color}
                    rightSection={<ChevronRight size={14} />}
                    fullWidth
                  >
                    View
                  </Button>
                </Stack>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>

        <Grid>
          {/* FAQs */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper withBorder p="xl" radius="md">
              <Stack gap="lg">
                <Group position="apart">
                  <Title order={4}>Frequently Asked Questions</Title>
                  <Button variant="subtle" rightSection={<ChevronRight size={14} />}>
                    View All
                  </Button>
                </Group>

                <Accordion variant="separated">
                  {faqs.map((faq, index) => (
                    <Accordion.Item key={index} value={`faq-${index}`}>
                      <Accordion.Control>
                        <Text fw={500}>{faq.question}</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Text size="sm">{faq.answer}</Text>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Contact & Support */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Paper withBorder p="xl" radius="md">
                <Stack gap="md">
                  <Title order={4}>Contact Support</Title>
                  
                  <Card withBorder radius="md" p="md">
                    <Group>
                      <Avatar 
                        size="lg"
                        radius="xl"
                        src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop&q=80"
                      />
                      <Stack gap={2}>
                        <Text fw={500}>Support Team</Text>
                        <Text size="sm" c="dimmed">Avg. response time: 2 hours</Text>
                        <Badge color="green" variant="dot" size="sm">Online</Badge>
                      </Stack>
                    </Group>
                  </Card>

                  <Stack gap="xs">
                    <Button 
                      variant="light" 
                      leftSection={<MessageSquare size={16} />}
                      fullWidth
                    >
                      Start Chat
                    </Button>
                    <Button 
                      variant="light"
                      leftSection={<Mail size={16} />}
                      fullWidth
                    >
                      Email Support
                    </Button>
                    <Button 
                      variant="light"
                      leftSection={<Phone size={16} />}
                      fullWidth
                    >
                      Schedule Call
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Paper withBorder p="xl" radius="md">
                <Stack gap="md">
                  <Title order={4}>Popular Articles</Title>
                  
                  {supportArticles.map((article, index) => (
                    <Group key={index} position="apart">
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Text size="sm" fw={500}>{article.title}</Text>
                          <Badge size="sm" variant="dot">{article.category}</Badge>
                        </Group>
                        <Group gap="xs">
                          <Clock size={12} />
                          <Text size="xs" c="dimmed">{article.readTime}</Text>
                        </Group>
                      </Stack>
                      <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                          <ActionIcon variant="subtle">
                            <MoreHorizontal size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<BookOpen size={14} />}>
                            Read Article
                          </Menu.Item>
                          <Menu.Item leftSection={<PlayCircle size={14} />}>
                            Watch Tutorial
                          </Menu.Item>
                          <Menu.Item leftSection={<ExternalLink size={14} />}>
                            Open in New Tab
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
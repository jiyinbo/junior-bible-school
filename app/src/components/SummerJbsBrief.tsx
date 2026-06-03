import { useState, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

export const SUMMER_JBS_INTRO =
  'The Summer Junior Bible School is organised by the Word of Faith Bible Institute and designed for pre-teens and teenagers to help deepen their understanding of the Bible, strengthen their faith, and connect with peers who share a similar passion for God. It provides a unique opportunity for young people to explore the Bible in an engaging and spiritually enriching environment during the summer holiday.';

const SCHEDULE = {
  dates: 'Monday 27 July to Friday 31 July 2026',
  graduation: 'Sunday 2 August 2026 (during the 3rd service in the Main Church)',
  venue: 'Winners Chapel International, 1 Churchill Close, Green Street Green Road, Dartford DA1 1QE',
  time: '9am to 4pm',
  registration: 'All students must be on campus by 8:45am at the latest for registration.',
} as const;

const BASIC_COURSES = [
  'Acceptable Christian Service',
  'Effective Bible Study',
  'Effective Prayer Life',
  'Kingdom Wealth',
  'Living a Sickness Free Life',
  'New Life in Christ',
  'Putting My Mind to Work',
  'The Holy Spirit',
  'The Power of Choices',
  'Time Management',
  'Understanding the Commission',
  'Walking By Faith',
] as const;

const ADVANCED_COURSES = [
  'Cultivating Christian Ethics',
  'Financial Prosperity',
  'Key to Success',
  'Kingdom Stewardship',
  'Lifestyle of Praise',
  'Living a Life of Faith',
  'Living Model of the Commission',
  'Making Godly Choices',
  'The Supernatural',
  'The Holy Spirit and The Teenager',
  'The Power of the Word',
  'Understanding Divine Direction',
] as const;

const MASTERCLASS_COURSES = [
  'The Mystery of Faith',
  'Dominion By Light',
  'Walking In Wisdom',
  'Seasons of Life',
  'Secrets of Supernatural Blessings',
  'Dimensions of the Holy Spirit',
  'The Secret Place',
  'The Supremacy of Praise',
] as const;

const BENEFITS = [
  {
    title: 'Spiritual Development',
    body: 'Grow in your relationship with God and deepen your faith.',
  },
  {
    title: "Deep Insight into God's Word",
    body: 'Gain a richer, more meaningful understanding of the Bible.',
  },
  {
    title: 'Personal Growth',
    body: "Learn to apply God's Word practically in everyday life.",
  },
  {
    title: 'Discover Your Purpose',
    body: "Uncover God's plan for your life and pursue your dreams with confidence.",
  },
  {
    title: 'Receive Wisdom',
    body: 'Acquire biblical wisdom to live a fulfilled and purpose-driven life.',
  },
] as const;

const ACTIVITIES = [
  'Interactive exploration of the Word of God',
  'Networking and fellowship with like-minded teenagers',
  'Q&A sessions with seasoned lecturers to get answers to questions on the Christian faith',
] as const;

const AUDIENCE = [
  {
    tier: 'Basic (10–12)',
    detail: 'All children aged 10–12 must register for this class, whether or not they have attended JBS before.',
  },
  {
    tier: 'Basic (Teens)',
    detail: 'Teenagers (13–15 years) who have not attended JBS before.',
  },
  {
    tier: 'Advanced',
    detail:
      'Teenagers who have completed Basic (Teens), or who are 15 years and above and have not attended JBS before.',
  },
  {
    tier: 'Masterclass',
    detail: 'Teenagers (15 years and above) who have completed the Advanced Class.',
  },
] as const;

type TierTab = 'basic' | 'advanced' | 'masterclass';

function CourseList({ courses }: { courses: readonly string[] }) {
  return (
    <List dense disablePadding sx={{ listStyleType: 'disc', pl: 2.5 }}>
      {courses.map((course) => (
        <ListItem key={course} disablePadding sx={{ display: 'list-item', py: 0.35 }}>
          <ListItemText
            primary={course}
            primaryTypographyProps={{ variant: 'body2', component: 'span' }}
          />
        </ListItem>
      ))}
    </List>
  );
}

function BriefAccordion({
  id,
  title,
  subtitle,
  defaultExpanded = false,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  return (
    <Accordion
      id={id}
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        '&:before': { display: 'none' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={600}>{title}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, pt: 0, pb: 3 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export function SummerJbsBrief() {
  const [tierTab, setTierTab] = useState<TierTab>('basic');

  return (
    <Box
      id="summer-jbs"
      component="section"
      aria-labelledby="programme-overview-heading"
      sx={{ mt: { xs: 4, md: 5 }, pb: { xs: 4, md: 6 } }}
    >
      <Typography
        id="programme-overview-heading"
        variant="h2"
        sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem' } }}
      >
        Programme overview
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          mt: 3,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          bgcolor: 'background.paper',
          borderColor: 'primary.main',
          borderWidth: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          2026 programme schedule
        </Typography>
        <Stack spacing={1.25}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Dates
            </Typography>
            <Typography variant="body2">{SCHEDULE.dates}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Graduation
            </Typography>
            <Typography variant="body2">{SCHEDULE.graduation}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Venue
            </Typography>
            <Typography variant="body2">{SCHEDULE.venue}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Daily time
            </Typography>
            <Typography variant="body2">
              {SCHEDULE.time}. {SCHEDULE.registration}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        <BriefAccordion
          id="tiers-curriculum"
          title="Tiers & curriculum"
          subtitle="Basic, Advanced, and Masterclass — progressive tracks"
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            Three tiers cater to different levels of knowledge: foundational principles in Basic,
            deeper practical application in Advanced, and an intensive Masterclass for leadership,
            independent study, and scriptural depth.
          </Typography>
          <Tabs
            value={tierTab}
            onChange={(_, v: TierTab) => setTierTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Basic" value="basic" />
            <Tab label="Advanced" value="advanced" />
            <Tab label="Masterclass" value="masterclass" />
          </Tabs>

          {tierTab === 'basic' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                The introductory level, accessible to all participants. Split into two streams by
                age: <strong>10–12</strong> and <strong>Teens</strong>. Both streams cover the same
                core courses.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip size="small" label="Ages 10–12" />
                <Chip size="small" label="Teens stream" />
              </Stack>
              <CourseList courses={BASIC_COURSES} />
            </Box>
          )}

          {tierTab === 'advanced' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                For students who have completed the Basic Class. Builds on foundational knowledge
                with deeper topics and practical applications of faith.
              </Typography>
              <CourseList courses={ADVANCED_COURSES} />
            </Box>
          )}

          {tierTab === 'masterclass' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                The highest tier for students who have completed Basic and Advanced and demonstrate
                strong scriptural foundation. Focuses on theological depth, independent study, and
                leadership — moving from learners to disciple-makers through discussions, research,
                and guided projects.
              </Typography>
              <CourseList courses={MASTERCLASS_COURSES} />
            </Box>
          )}
        </BriefAccordion>

        <BriefAccordion id="who-should-register" title="Who should register?">
          <Stack spacing={2}>
            {AUDIENCE.map((row) => (
              <Box key={row.tier}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {row.tier}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.65 }}>
                  {row.detail}
                </Typography>
              </Box>
            ))}
          </Stack>
        </BriefAccordion>

        <BriefAccordion id="benefits" title="Benefits">
          <Stack spacing={2}>
            {BENEFITS.map((item) => (
              <Box key={item.title}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.65 }}>
                  {item.body}
                </Typography>
              </Box>
            ))}
          </Stack>
        </BriefAccordion>

        <BriefAccordion id="activities" title="Activities during the programme">
          <List dense disablePadding>
            {ACTIVITIES.map((activity) => (
              <ListItem key={activity} disableGutters sx={{ alignItems: 'flex-start', py: 0.5 }}>
                <ListItemText
                  primary={activity}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                />
              </ListItem>
            ))}
          </List>
        </BriefAccordion>

        <BriefAccordion id="feeding" title="Feeding arrangement">
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              <strong>Breakfast:</strong> Students should have breakfast at home before arriving.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              <strong>Lunch & snacks:</strong> General lunch and snacks will be provided on campus.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              <strong>Special dietary needs:</strong> Parents must provide a lunch pack for any
              child with special dietary requirements or allergies, as we are unable to cater to
              individual needs.
            </Typography>
          </Stack>
        </BriefAccordion>

        <BriefAccordion id="impartation" title="Impartation & baptisms">
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Teachings culminate in a powerful time of impartation, with spiritual reinforcement and
            prayer for personal growth. On the final afternoon of lectures (Friday), attendees may
            be baptised in the Holy Spirit and publicly declare their faith through water baptism by
            immersion — a tangible step of spiritual commitment.
          </Typography>
        </BriefAccordion>

        <BriefAccordion id="graduation" title="Graduation ceremony">
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              A grand graduation is held in the Main Church during the 3rd service on Sunday,
              marking the culmination of students&apos; dedication and spiritual growth throughout
              the programme.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              All participants wear graduation gowns, symbolising successful completion and
              readiness to apply what they have learned. Outstanding students from Basic, Advanced,
              and Masterclass tiers are recognised for exceptional achievement.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              The Resident Pastor prays over the graduates, asking for God&apos;s continued
              guidance as they move forward — underscoring the church&apos;s support for the next
              generation of leaders.
            </Typography>
          </Stack>
        </BriefAccordion>
      </Stack>
    </Box>
  );
}

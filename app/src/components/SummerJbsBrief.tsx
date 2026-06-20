import { useState, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

export const SUMMER_JBS_INTRO_PARAS = [
  'The Summer Junior Bible School is organised by the Word of Faith Bible Institute and designed for pre-teens and teenagers to help deepen their understanding of the Bible, strengthen their faith and connect with their peers who share similar passion for God.',
  'The Bible School provides a unique opportunity for young people to explore the Bible in an engaging and spiritually enriching environment during the summer holiday.',
] as const;

const SCHEDULE_INTRO = 'The schedule for our 2026 edition is below:';

const SCHEDULE = {
  date: 'Monday 27 July to Friday 31 July 2026',
  graduation: 'Sunday 2 August 2026 (during the 3rd service in the Main Church)',
  venue: 'Winners Chapel International, 1 Churchill Close, Green Street Green Road, Dartford DA1 1QE',
  time: '9am to 4pm (All students must be on campus latest by for registration 8:45am)',
} as const;

const TIERS_INTRO =
  'The Summer Junior Bible School offers 3 distinct Tiers: Basic, Advanced and Masterclass. These tiers are designed to cater to the varying degrees of knowledge and understanding of the students, providing a structured and progressive learning experience. By starting with the foundational principles in the Basic Class and moving to more complex and practical applications in the Advanced Class, students are equipped with a robust understanding of the Bible and its application in everyday life. The Masterclass is an intensive, high-level track for advanced students, focusing on depth, leadership training, and independent scriptural study.';

const BASIC_INTRO =
  'The Basic Class serves as the introductory level of the Summer Junior Bible School. The curriculum is designed to be accessible and engaging, ensuring that all participants, regardless of their prior knowledge, can grasp the essential concepts. This tier is divided into 2 streams depending on the age of the students i.e., 10-12 and Teens. The Basic class explores the following courses:';

const ADVANCED_INTRO =
  'The Advanced Class is designed for students who have completed the Basic Class. This level builds on the knowledge acquired in the Basic Class and delves deeper into other topics including practical applications of faith. The Advanced Class explores the following courses:';

const MASTERCLASS_INTRO =
  'The Masterclass is the highest tier of the Summer Junior Bible School, intended for students who have already completed the Basic and Advanced tiers and demonstrate a strong foundational knowledge of scripture. This tier focuses on theological depth, independent study, and leadership development. Through advanced discussions, research assignments, and guided projects, students are challenged to move from being learners to becoming disciple-makers, equipping them to live out their faith with conviction and influence.';

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
  'Spiritual Development - Grow in your relationship with God and deepen your faith.',
  "Deep Insight into God's Word - Gain a richer, more meaningful understanding of the Bible.",
  "Personal Growth - Learn to apply God's Word practically in everyday life.",
  "Discover Your Purpose - Uncover God's plan for your life and pursue your dreams with confidence.",
  'Receive Wisdom - Acquire biblical wisdom to live a fulfilled and purpose-driven life.',
] as const;

const ACTIVITIES = [
  'Interactive exploration of the Word of God',
  'Networking and fellowship with like-minded teenagers',
  'Q&A sessions with seasoned lecturers to get answers to bugging questions on the Christian faith',
] as const;

const AUDIENCE = [
  {
    tier: 'Basic (10-12)',
    detail:
      'All children aged 10-12 have to register for this class irrespective of whether they have attended JBS before',
  },
  {
    tier: 'Basic (Teens)',
    detail: 'Teenagers (13 - 15 years) who have not attended JBS before',
  },
  {
    tier: 'Advanced',
    detail:
      "Teenagers who have attended the Basic (Teens) Class or are 15 years and above and haven't attended JBS before.",
  },
  {
    tier: 'Masterclass',
    detail: 'Teenagers (15 years and above) who have attended the Advanced Class.',
  },
] as const;

const GRADUATION_PARAS = [
  'At the end of the Summer Junior Bible School, a grand graduation ceremony is held in the Main Church during the 3rd service on Sunday. This ceremony is a significant and joyous occasion, marking the culmination of the students\' hard work, dedication, and spiritual growth throughout the programme.',
  'All participants don graduation gowns, adding to the formality and significance of the event. This attire symbolizes their successful completion of the program and their readiness to apply the lessons learned in their daily lives. The sight of students in their gowns is a proud and memorable moment for parents and the entire church community.',
  'During the graduation ceremony, outstanding students from both the Basic, Advanced and Masterclass tiers are recognized for their exceptional achievements. The ceremony also includes a special segment where the Resident Pastor prays over the graduates, asking for God\'s continued guidance and blessings as they move forward in their faith journey. This underscores the church\'s support for the students\' ongoing growth and development.',
  'The graduation ceremony is a major highlight of the Summer Junior Bible School. It not only celebrates the students\' accomplishments but also reinforces their commitment to living out the biblical principles they have learned. This event is a testament to the students\' dedication and the church\'s investment in nurturing the next generation of leaders.',
] as const;

const IMPARTATION =
  'The teachings culminate in a powerful time of impartation, where students receive spiritual reinforcement and prayer for personal growth. On the final day of lectures i.e., Friday afternoon, attendees will have the opportunity to be baptised in the Holy Spirit, as well as to publicly declare their faith through water baptism by immersion, sealing their experience with a tangible step of spiritual commitment.';

const BAPTISM =
  'Participants at JBS are given the opportunity to be baptised in water by immersion and receive the baptism of the Holy Ghost with the evidence of speaking in tongues, following the Impartation service. Those taking part in water baptism will be required to register and bring a change of clothing. A certificate of water baptism will be issued by the church to all participants.';

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

function BodyText({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
      {children}
    </Typography>
  );
}

function BriefAccordion({
  id,
  title,
  children,
  defaultExpanded = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
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
        <Typography fontWeight={600} sx={{ pr: 1 }}>
          {title}
        </Typography>
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
      sx={{ mt: { xs: 4, md: 5 }, pb: { xs: 4, md: 6 } }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          bgcolor: 'background.paper',
          borderColor: 'primary.main',
          borderWidth: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Programme Schedule:
        </Typography>
        <BodyText>{SCHEDULE_INTRO}</BodyText>
        <Stack spacing={1.25} sx={{ mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Date
            </Typography>
            <Typography variant="body2">{SCHEDULE.date}</Typography>
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
              Time
            </Typography>
            <Typography variant="body2">{SCHEDULE.time}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        <BriefAccordion id="tiers-curriculum" title="Tiers">
          <BodyText>{TIERS_INTRO}</BodyText>
          <Tabs
            value={tierTab}
            onChange={(_, v: TierTab) => setTierTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', my: 2 }}
          >
            <Tab label="Basic" value="basic" />
            <Tab label="Advanced" value="advanced" />
            <Tab label="Masterclass" value="masterclass" />
          </Tabs>

          {tierTab === 'basic' && (
            <Box>
              <BodyText>{BASIC_INTRO}</BodyText>
              <Box sx={{ mt: 1.5 }}>
                <CourseList courses={BASIC_COURSES} />
              </Box>
            </Box>
          )}

          {tierTab === 'advanced' && (
            <Box>
              <BodyText>{ADVANCED_INTRO}</BodyText>
              <Box sx={{ mt: 1.5 }}>
                <CourseList courses={ADVANCED_COURSES} />
              </Box>
            </Box>
          )}

          {tierTab === 'masterclass' && (
            <Box>
              <BodyText>{MASTERCLASS_INTRO}</BodyText>
              <Box sx={{ mt: 1.5 }}>
                <CourseList courses={MASTERCLASS_COURSES} />
              </Box>
            </Box>
          )}
        </BriefAccordion>

        <BriefAccordion id="who-should-register" title="Who are the target audience for this event?">
          <Stack spacing={2}>
            {AUDIENCE.map((row) => (
              <Box key={row.tier}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {row.tier}:
                </Typography>
                <BodyText>{row.detail}</BodyText>
              </Box>
            ))}
          </Stack>
        </BriefAccordion>

        <BriefAccordion
          id="benefits"
          title="What are some benefits of the Summer Junior Bible School?"
        >
          <Stack spacing={1.25} component="ul" sx={{ m: 0, pl: 2.5 }}>
            {BENEFITS.map((item) => (
              <Typography
                key={item}
                component="li"
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.65, py: 0.25 }}
              >
                {item}
              </Typography>
            ))}
          </Stack>
        </BriefAccordion>

        <BriefAccordion
          id="activities"
          title="Activities that will take place during the Summer Junior Bible School:"
        >
          <List dense disablePadding component="ul" sx={{ listStyleType: 'disc', pl: 2.5, m: 0 }}>
            {ACTIVITIES.map((activity) => (
              <ListItem key={activity} disablePadding sx={{ display: 'list-item', py: 0.35 }}>
                <ListItemText
                  primary={activity}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                />
              </ListItem>
            ))}
          </List>
        </BriefAccordion>

        <BriefAccordion id="feeding" title="Feeding Arrangement:">
          <Stack spacing={1.5}>
            <BodyText>
              <strong>Breakfast:</strong> Students are to have breakfast at home before arriving.
            </BodyText>
            <BodyText>
              <strong>Lunch & Snacks:</strong> General lunch and snacks will be provided.
            </BodyText>
            <BodyText>
              <strong>Special Dietary Needs:</strong> Parents must provide a lunch pack for any child
              with special dietary requirements or allergies, as we are unable to cater to individual
              needs.
            </BodyText>
          </Stack>
        </BriefAccordion>

        <BriefAccordion id="impartation" title="Impartation:">
          <BodyText>{IMPARTATION}</BodyText>
        </BriefAccordion>

        <BriefAccordion id="baptism" title="Water Baptism and Holy Ghost Baptism:">
          <BodyText>{BAPTISM}</BodyText>
        </BriefAccordion>

        <BriefAccordion id="graduation" title="Graduation:">
          <Stack spacing={1.5}>
            {GRADUATION_PARAS.map((para) => (
              <BodyText key={para.slice(0, 40)}>{para}</BodyText>
            ))}
          </Stack>
        </BriefAccordion>
      </Stack>
    </Box>
  );
}

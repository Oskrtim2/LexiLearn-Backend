import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create a default teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@lexilearn.com' },
    update: {},
    create: {
      email: 'teacher@lexilearn.com',
      password: 'password123', // In a real app, hash this!
      role: Role.TEACHER,
    },
  });

  // Create a default student user
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@lexilearn.com' },
    update: {},
    create: {
      email: 'student@lexilearn.com',
      password: 'password123', // In a real app, hash this!
      role: Role.STUDENT,
    },
  });

  // Create the student profile
  const studentProfile = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      firstName: 'Alice',
      lastName: 'Wonder',
      birthDate: new Date('2015-05-15'),
    },
  });

  // Create Skills
  const readingSkill = await prisma.skill.upsert({
    where: { name: 'Phonological Awareness' },
    update: {},
    create: {
      name: 'Phonological Awareness',
      category: 'Reading',
      description: 'Ability to recognize and manipulate sounds in spoken words.',
    },
  });

  // Create an Exercise
  const exercise = await prisma.exercise.create({
    data: {
      title: 'Rhyming Words Match',
      description: 'Match the words that rhyme.',
      difficulty: 1,
      content: {
        pairs: [
          { word1: 'Cat', word2: 'Bat' },
          { word1: 'Dog', word2: 'Log' },
        ]
      },
      skillId: readingSkill.id,
    }
  });

  console.log({ teacher, studentProfile, readingSkill, exercise });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

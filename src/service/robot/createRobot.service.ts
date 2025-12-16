import prisma from '@/libs/prisma';

interface CreateRobotInput {
  name: string;
  category_id: number;
  control_type: 'autonomous' | 'remote' | 'semi_autonomous';
}

export async function createRobot(
  data: CreateRobotInput,
  competitor_id: number
) {
  return prisma.robots.create({
    data: {
      name: data.name,
      category_id: data.category_id,
      control_type: data.control_type,
      competitor_id,
    }
  });
}

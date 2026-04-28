import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const admins = [
    { email: 'xavierzale@gmail.com', name: 'Xavier Admin' },
    { email: 'zmanschoeman@gmail.com', name: 'Zman Admin' }
  ]

  for (const admin of admins) {
    const existing = await prisma.user.findUnique({
      where: { email: admin.email }
    })

    if (existing) {
      await prisma.user.update({
        where: { email: admin.email },
        data: { role: 'ADMIN', isApproved: true }
      })
      console.log(`Updated ${admin.email} to ADMIN`)
    } else {
      await prisma.user.create({
        data: {
          email: admin.email,
          name: admin.name,
          password: await bcrypt.hash('admin123', 10),
          role: 'ADMIN',
          isApproved: true
        }
      })
      console.log(`Created admin user: ${admin.email}`)
    }
  }
}

main()
  .then(() => {
    console.log('Seed completed!')
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

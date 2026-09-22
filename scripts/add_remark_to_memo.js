const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const memo = await prisma.memo.update({
    where: { id: '8fedc65c-285f-42bc-9470-8c02361d424c' },
    data: {
      remark: '1. อุปกรณ์คอมพิวเตอร์และสิทธิ์การใช้งานถือเป็นกรรมสิทธิ์ของโรงแรม S Hotel\n2. เมื่อสิ้นสุดระยะเวลาการใช้งานต้องส่งมอบคืนแผนก IT ทันทีในสภาพสมบูรณ์'
    }
  });

  console.log('UPDATED_MEMO_REMARK:', memo.remark);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

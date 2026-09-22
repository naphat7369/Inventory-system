const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dept = await prisma.department.findFirst();
  if (!dept) {
    console.error('No department found');
    return;
  }

  // A huge continuous paragraph without any <br> or other blocks, exceeding 1 page
  const sentence = 'ตามที่ฝ่ายเทคโนโลยีสารสนเทศได้ดำเนินการตรวจสอบและปรับปรุงโครงสร้างพื้นฐานระบบเครือข่ายความปลอดภัยข้อมูลประจำปีของโรงแรมตามมาตรฐานสากล ISO/IEC 27001 และข้อกำหนดการคุ้มครองข้อมูลส่วนบุคคล (PDPA) เพื่อให้ระบบสารสนเทศทั้งหมดสามารถรองรับการดำเนินงานของฝ่ายบริการลูกค้าและส่วนปฏิบัติการได้อย่างต่อเนื่อง ปราศจากการหยุดชะงักของระบบอันอาจก่อให้เกิดความเสียหายต่อชื่อเสียงและรายได้ขององค์กร ';
  const massiveParagraph = `<p>${sentence.repeat(16)}</p>`;

  const memo = await prisma.memo.create({
    data: {
      documentNo: 'IT 003/2569',
      documentDate: new Date('2026-09-19'),
      departmentId: dept.id,
      subHeader: `${dept.name} DEPARTMENT`,
      recipient: 'ดร.สรัญ ลิ้มสวัสดิ์วงศ์ Managing Director',
      sender: 'นภัทร วรรณหม้อ IT Officer',
      subject: 'รายงานการประเมินความมั่นคงปลอดภัยระบบสารสนเทศฉบับพิเศษ (Single Massive Paragraph Test)',
      reference: 'ประกาศนโยบายความมั่นคงปลอดภัยสารสนเทศ ฉบับที่ 3/2569',
      carbonCopy: 'General Manager',
      content: massiveParagraph,
      status: 'FINAL',
      signatures: {
        create: [
          {
            role: 'นำเสนอโดย',
            name: 'นภัทร วรรณหม้อ',
            position: 'IT Officer',
            sortOrder: 1,
          },
          {
            role: 'อนุมัติโดย',
            name: 'ดร.สรัญ ลิ้มสวัสดิ์วงศ์',
            position: 'Managing Director',
            sortOrder: 2,
          }
        ]
      }
    }
  });

  console.log('MASSIVE_PARAGRAPH_MEMO_ID:' + memo.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

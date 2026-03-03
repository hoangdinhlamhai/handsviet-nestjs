import { PrismaClient, TreatmentCategory, StaffPosition } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding HandsViet database...');

    // 1. Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@handsviet.vn' },
        update: {},
        create: {
            email: 'admin@handsviet.vn',
            password: adminPassword,
            name: 'Admin HandsViet',
            role: 'SUPER_ADMIN',
            isVerified: true,
        },
    });
    console.log('✅ Admin user created');

    // 2. Create clinic owner
    const ownerPassword = await bcrypt.hash('owner123', 10);
    const owner = await prisma.user.upsert({
        where: { email: 'owner@handsviet.vn' },
        update: {},
        create: {
            email: 'owner@handsviet.vn',
            password: ownerPassword,
            name: 'Dr. Nguyễn Văn An',
            role: 'CLINIC_OWNER',
            isVerified: true,
        },
    });
    console.log('✅ Clinic owner created');

    // 3. Create test customer
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customer = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: {},
        create: {
            email: 'customer@test.com',
            password: customerPassword,
            name: 'Trần Minh Khoa',
            phone: '0901234567',
            role: 'CUSTOMER',
            isVerified: true,
        },
    });
    console.log('✅ Test customer created');

    // 4. Check if clinics already exist
    const existingClinic = await prisma.clinics.findUnique({ where: { slug: 'handsviet-q1' } });
    if (existingClinic) {
        console.log('ℹ️  Clinics already exist, skipping clinic/service/staff creation');
        console.log('\n🎉 Seed completed!');
        printAccounts();
        return;
    }

    // 5. Create clinics
    const clinic = await prisma.clinics.create({
        data: {
            id: require('crypto').randomUUID(),
            name: 'HandsViet - Quận 1',
            slug: 'handsviet-q1',
            description: 'Trung tâm Phục hồi Chức năng & Y học Thể thao hàng đầu tại TP.HCM.',
            address: '123 Nguyễn Huệ',
            city: 'TP.HCM',
            district: 'Quận 1',
            ward: 'Phường Bến Nghé',
            phone: '028 1234 5678',
            email: 'q1@handsviet.vn',
            openTime: '08:00',
            closeTime: '20:00',
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            ownerId: owner.id,
            updatedAt: new Date(),
        },
    });

    const clinic2 = await prisma.clinics.create({
        data: {
            id: require('crypto').randomUUID(),
            name: 'HandsViet - Quận 7',
            slug: 'handsviet-q7',
            description: 'Chi nhánh Quận 7 chuyên điều trị chấn thương thể thao và phục hồi sau phẫu thuật.',
            address: '456 Nguyễn Thị Thập',
            city: 'TP.HCM',
            district: 'Quận 7',
            ward: 'Phường Tân Phú',
            phone: '028 9876 5432',
            email: 'q7@handsviet.vn',
            openTime: '08:00',
            closeTime: '20:00',
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            ownerId: owner.id,
            updatedAt: new Date(),
        },
    });
    console.log('✅ Clinics created');

    // 6. Create services
    const servicesData = [
        { name: 'Khám & Tư vấn ban đầu', description: 'Đánh giá tình trạng, chẩn đoán và lập kế hoạch trị liệu.', price: 300000, duration: 30, category: TreatmentCategory.CONSULTATION, order: 1 },
        { name: 'Vật lý trị liệu cơ bản', description: 'Bài tập và kỹ thuật vật lý trị liệu phục hồi vận động.', price: 500000, duration: 60, category: TreatmentCategory.PHYSIOTHERAPY, order: 2 },
        { name: 'Vật lý trị liệu chuyên sâu', description: 'Chương trình trị liệu chuyên sâu, công nghệ hiện đại.', price: 800000, duration: 90, category: TreatmentCategory.PHYSIOTHERAPY, order: 3 },
        { name: 'Phục hồi chấn thương thể thao', description: 'Phục hồi chuyên biệt cho vận động viên.', price: 700000, duration: 60, category: TreatmentCategory.SPORTS_MEDICAL_SUPPORT, order: 4 },
        { name: 'Gói phục hồi sau phẫu thuật', description: 'Phục hồi chức năng toàn diện sau phẫu thuật xương khớp.', price: 1200000, duration: 90, category: TreatmentCategory.REHABILITATION, order: 5 },
        { name: 'Chăm sóc cột sống toàn diện', description: 'Điều chỉnh sai lệch cột sống, giảm đau lưng và cổ.', price: 600000, duration: 45, category: TreatmentCategory.COMPREHENSIVE_SPINE_CARE, order: 6 },
        { name: 'Massage trị liệu thể thao', description: 'Xoa bóp và vận động khớp chuyên nghiệp.', price: 500000, duration: 60, category: TreatmentCategory.SPORTS_RELAXATION_MASSAGE, order: 7 },
        { name: 'Điện trị liệu', description: 'Sử dụng dòng điện trị liệu giảm đau, phục hồi cơ.', price: 400000, duration: 45, category: TreatmentCategory.ELECTROTHERAPY, order: 8 },
        { name: 'Phục hồi dây chằng', description: 'Điều trị và phục hồi chấn thương dây chằng.', price: 900000, duration: 60, category: TreatmentCategory.LIGAMENT_REHABILITATION, order: 9 },
        { name: 'Gói trị liệu toàn diện', description: 'Kết hợp nhiều phương pháp. Tiết kiệm 20%.', price: 1500000, duration: 120, category: TreatmentCategory.COMBO, order: 10 },
    ];

    for (const s of servicesData) {
        await prisma.service.create({ data: { ...s, clinicId: clinic.id } });
    }
    for (const s of servicesData.slice(0, 6)) {
        await prisma.service.create({ data: { ...s, clinicId: clinic2.id } });
    }
    console.log('✅ Services created');

    // 7. Create staff
    const staffUsers = [
        { email: 'therapist1@handsviet.vn', name: 'Bs. Lê Hoàng Nam', position: StaffPosition.DOCTOR },
        { email: 'therapist2@handsviet.vn', name: 'KTV. Phạm Thị Hoa', position: StaffPosition.THERAPIST },
        { email: 'therapist3@handsviet.vn', name: 'KTV. Trần Đức Bình', position: StaffPosition.THERAPIST },
        { email: 'therapist4@handsviet.vn', name: 'Bs. Nguyễn Khánh Linh', position: StaffPosition.DOCTOR },
    ];

    for (const su of staffUsers) {
        const staffPw = await bcrypt.hash('staff123', 10);
        const staffUser = await prisma.user.upsert({
            where: { email: su.email },
            update: {},
            create: {
                email: su.email, password: staffPw, name: su.name,
                role: 'STAFF', isVerified: true,
            },
        });

        const existingStaff = await prisma.staff.findUnique({ where: { userId: staffUser.id } });
        if (!existingStaff) {
            const newStaff = await prisma.staff.create({
                data: {
                    userId: staffUser.id, clinicId: clinic.id, position: su.position,
                    bio: 'Chuyên gia phục hồi chức năng với nhiều năm kinh nghiệm.',
                    rating: 4.5 + Math.random() * 0.5,
                    totalReviews: Math.floor(Math.random() * 50) + 10,
                },
            });

            // Create schedules (Mon-Sat)
            for (let day = 1; day <= 6; day++) {
                await prisma.staffSchedule.create({
                    data: { staffId: newStaff.id, dayOfWeek: day, startTime: '08:00', endTime: '20:00', isOff: false },
                });
            }
            // Sunday off
            await prisma.staffSchedule.create({
                data: { staffId: newStaff.id, dayOfWeek: 0, startTime: '08:00', endTime: '20:00', isOff: true },
            });
        }
    }
    console.log('✅ Staff/Therapists created');

    console.log('\n🎉 Seed completed!');
    printAccounts();
}

function printAccounts() {
    console.log('\n📋 Test accounts:');
    console.log('   Admin:    admin@handsviet.vn / admin123');
    console.log('   Owner:    owner@handsviet.vn / owner123');
    console.log('   Customer: customer@test.com / customer123');
    console.log('   Staff:    therapist1@handsviet.vn / staff123');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });

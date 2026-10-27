const User = require('./models/User');

/**
 * Seeds initial required administrative and default officer accounts if they do not exist.
 * This does NOT generate or insert any applications.
 */
const seedInitialUsers = async () => {
  try {
    // 1. Seed Admin
    const existingAdmin = await User.findOne({ email: 'admin@municipal.gov' });
    if (!existingAdmin) {
      await User.create({
        name: 'Municipal System Administrator',
        email: 'admin@municipal.gov',
        mobile: '9876543210',
        password: 'AdminPassword@123', // Hashed by User model pre-save hook
        address: 'Municipal Corporation Headquarters, Civil Lines',
        city: 'Metropolitan District',
        state: 'Central State',
        pincode: '110001',
        role: 'admin',
        department: 'E-Governance & IT Administration',
      });
      console.log('[Seed] Default Admin account created: admin@municipal.gov');
    }

    // 2. Seed Officer
    let existingOfficer = await User.findOne({ email: 'officer@municipal.gov' });
    if (!existingOfficer) {
      await User.create({
        name: 'Rajesh Sharma (Registrar)',
        email: 'officer@municipal.gov',
        mobile: '9876543211',
        password: 'OfficerPassword@123',
        employeeId: 'REG-004521',
        designation: 'Registrar (Civil Registration Officer)',
        address: 'Zone-1 Zonal Municipal Office, Desk 4',
        city: 'Metropolitan District',
        state: 'Central State',
        pincode: '110001',
        jurisdictionAddress: 'Zone-1 Zonal Municipal Office, Desk 4, Metropolitan District, Central State - 110001',
        role: 'officer',
        department: 'Birth & Death Civil Registration Desk',
      });
      console.log('[Seed] Default Officer account created: officer@municipal.gov');
    } else {
      let needsUpdate = false;
      if (!existingOfficer.employeeId) {
        existingOfficer.employeeId = 'REG-004521';
        needsUpdate = true;
      }
      if (!existingOfficer.designation) {
        existingOfficer.designation = 'Registrar (Civil Registration Officer)';
        needsUpdate = true;
      }
      if (!existingOfficer.jurisdictionAddress) {
        existingOfficer.jurisdictionAddress = 'Zone-1 Zonal Municipal Office, Desk 4, Metropolitan District, Central State - 110001';
        needsUpdate = true;
      }
      if (needsUpdate) {
        await existingOfficer.save();
        console.log('[Seed] Default Officer account updated with officer details.');
      }
    }

    // 3. Seed Demo Citizen
    const existingCitizen = await User.findOne({ email: 'citizen@example.com' });
    if (!existingCitizen) {
      await User.create({
        name: 'Amit Kumar',
        email: 'citizen@example.com',
        mobile: '9876543212',
        password: 'CitizenPassword@123',
        address: 'House #42, Green Park Avenue',
        city: 'Metropolitan District',
        state: 'Central State',
        pincode: '110016',
        role: 'citizen',
      });
      console.log('[Seed] Demo Citizen account created: citizen@example.com');
    }
  } catch (error) {
    console.error('[Seed Error] Failed to seed default accounts:', error.message);
  }
};

module.exports = seedInitialUsers;

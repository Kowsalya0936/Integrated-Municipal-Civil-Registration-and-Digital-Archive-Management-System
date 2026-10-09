const fs = require('fs');
const target = 'client/src/pages/citizen/ApplyDeathCertificate.js';
fs.writeFileSync(target, '');
console.log('initialized target');
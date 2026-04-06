const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/97154/Desktop/VEHICLES LIST.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('Excel Data Preview:');
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (error) {
  console.error('Error reading file:', error.message);
}

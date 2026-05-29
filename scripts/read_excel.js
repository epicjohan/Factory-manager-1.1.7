import XLSX from 'xlsx';

const filePath = '/Users/johanhouben/Factory_manager/Factory-manager-1.1.7/Data dictionairy/MKG velden Artikel.xlsx';
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

const filtered = data.filter(row => {
    const veld = (row.Veld || '').toLowerCase();
    return veld.startsWith('arti_') && row['Is database veld'] === true;
});

console.log(`Found ${filtered.length} database fields starting with 'arti_':`);
filtered.forEach(row => {
    console.log(`- ${row.Veld}: ${row.Label} (${row.Type}, format: ${row.Formaat})`);
});

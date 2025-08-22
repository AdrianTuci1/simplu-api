const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const BUSINESS_ID = process.env.BUSINESS_ID || 'business-123';
const LOCATION_ID = process.env.LOCATION_ID || 'location-456';

/**
 * Exemplu de utilizare pentru API-ul de statistici
 * Demonstrează cum să obții toate statisticile într-o singură cerere
 */
async function getDashboardStatistics() {
  try {
    console.log('🎯 Obținerea tuturor statisticilor într-o singură cerere...\n');
    
    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}/statistics/business`
    );
    
    if (response.status === 200 && response.data.success) {
      const stats = response.data.data;
      
      console.log('✅ Statistici obținute cu succes!');
      console.log('📊 Dashboard Statistics:\n');
      
      // Programări
      console.log('📅 PROGRAMĂRI:');
      console.log(`   Azi: ${stats.appointments.today} programări`);
      console.log(`   Ieri: ${stats.appointments.yesterday} programări`);
      console.log(`   Diferență: ${stats.appointments.difference > 0 ? '+' : ''}${stats.appointments.difference} (${stats.appointments.percentageChange}%)`);
      
      // Clienți
      console.log('\n👥 CLIENȚI:');
      console.log(`   Luna aceasta: ${stats.clients.thisMonth} clienți`);
      console.log(`   Luna trecută: ${stats.clients.lastMonth} clienți`);
      console.log(`   Diferență: ${stats.clients.difference > 0 ? '+' : ''}${stats.clients.difference} (${stats.clients.percentageChange}%)`);
      
      // Încasări
      console.log('\n💰 ÎNCASĂRI:');
      console.log(`   Luna aceasta: $${stats.revenue.thisMonth}`);
      console.log(`   Luna trecută: $${stats.revenue.lastMonth}`);
      console.log(`   Diferență: ${stats.revenue.difference > 0 ? '+' : ''}$${stats.revenue.difference} (${stats.revenue.percentageChange}%)`);
      
      // Inventar
      console.log('\n📦 INVENTAR:');
      console.log(`   Total produse: ${stats.inventory.totalProducts}`);
      console.log(`   Stoc scăzut: ${stats.inventory.lowStock}`);
      console.log(`   Fără stoc: ${stats.inventory.outOfStock}`);
      console.log(`   Valoare totală: $${stats.inventory.totalValue}`);
      
      // Sumar
      console.log('\n📊 SUMAR:');
      console.log(`   Venit total: $${stats.summary.totalRevenue}`);
      console.log(`   Clienți totali: ${stats.summary.totalClients}`);
      console.log(`   Programări totale: ${stats.summary.totalAppointments}`);
      console.log(`   Venit mediu per client: $${stats.summary.averageRevenuePerClient}`);
      
      return stats;
    } else {
      console.log('❌ Eroare la obținerea statisticilor');
      console.log(response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Eroare:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Exemplu de utilizare în aplicație
 */
async function exampleUsage() {
  console.log('🚀 Exemplu de utilizare API Statistici\n');
  
  // Obține toate statisticile într-o singură cerere
  const stats = await getDashboardStatistics();
  
  if (stats) {
    console.log('\n🎯 Utilizare în aplicație:');
    console.log('// Toate statisticile sunt disponibile în obiectul stats');
    console.log('// Poți accesa direct orice metrică:');
    console.log(`// stats.appointments.today = ${stats.appointments.today}`);
    console.log(`// stats.clients.thisMonth = ${stats.clients.thisMonth}`);
    console.log(`// stats.revenue.thisMonth = ${stats.revenue.thisMonth}`);
    console.log(`// stats.inventory.totalProducts = ${stats.inventory.totalProducts}`);
    
    console.log('\n✅ Exemplu completat cu succes!');
    console.log('💡 Acest endpoint oferă toate statisticile necesare pentru dashboard într-o singură cerere.');
  }
}

// Rulare exemplu
if (require.main === module) {
  exampleUsage().catch(console.error);
}

module.exports = {
  getDashboardStatistics,
  exampleUsage
};

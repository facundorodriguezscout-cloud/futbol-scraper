const puppeteer = require('puppeteer');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
  const page = await browser.newPage();

  let tablaData = null;

  page.on('response', async (response) => {
    if (response.url().includes('tables_and_fixtures/fahi')) {
      try {
        tablaData = await response.json();
      } catch (e) {}
    }
  });

  await page.goto('https://www.promiedos.com.ar/league/federal-a/fahi', {
    waitUntil: 'networkidle2'
  });

  await browser.close();

  if (!tablaData) {
    console.log('No se pudo capturar la respuesta de la API.');
    return;
  }

  // --- Procesar la tabla de posiciones (como ya lo teníamos) ---
  const tablas = [];
  tablaData.tables_groups.forEach(grupo => {
    grupo.tables.forEach(zona => {
      const equipos = zona.table.rows.map(row => {
        const valores = {};
        row.values.forEach(v => { valores[v.key] = v.value; });
        return {
          posicion: row.num,
          equipo: row.entity.object.name,
          puntos: valores.Points,
          jugados: valores.GamePlayed,
          goles: valores.Goals,
          diferencia: valores.Ratio,
          ganados: valores.GamesWon,
          empatados: valores.GamesEven,
          perdidos: valores.GamesLost
        };
      });
      tablas.push({ fase: grupo.name, zona: zona.name, equipos });
    });
  });
  fs.writeFileSync('tabla.json', JSON.stringify(tablas, null, 2));

  // --- Procesar los partidos de la fecha actual ---
  const filtroActual = tablaData.games.filters.find(f => f.games);
  let partidos = [];

  if (filtroActual) {
    partidos = filtroActual.games.map(g => ({
      fecha_nombre: g.stage_round_name,
      equipo_local: g.teams[0].name,
      equipo_visitante: g.teams[1].name,
      fecha_hora: g.start_time,
      estado: g.status.name
    }));
    fs.writeFileSync('partidos.json', JSON.stringify(partidos, null, 2));
  }

  console.log(`Listo! ${tablas.length} tablas guardadas en tabla.json, ${partidos.length} partidos en partidos.json`);
}

main().catch(err => console.error('Error:', err.message));
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://pfwkhhzhcdatgrivqegm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2toaHpoY2RhdGdyaXZxZWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNDQzMjUsImV4cCI6MjEwNDkyMDMyNX0.p8HOzXWUZP6v46KIq0McCXv8tYDlMNnmTkF_VoaJb90'
);

async function main() {
  // --- Subir la tabla de posiciones ---
  const tablas = JSON.parse(fs.readFileSync('tabla.json', 'utf-8'));
  const filasPosiciones = [];

  tablas.forEach(t => {
    t.equipos.forEach(e => {
      const [golesFavor, golesContra] = e.goles.split(':').map(Number);
      filasPosiciones.push({
        fase: t.fase,
        zona: t.zona,
        posicion: Number(e.posicion),
        equipo: e.equipo,
        puntos: Number(e.puntos),
        jugados: Number(e.jugados),
        goles_favor: golesFavor,
        goles_contra: golesContra,
        diferencia: Number(e.diferencia),
        ganados: Number(e.ganados),
        empatados: Number(e.empatados),
        perdidos: Number(e.perdidos)
      });
    });
  });

  const { error: errorPosiciones } = await supabase
    .from('posiciones')
    .upsert(filasPosiciones, { onConflict: 'fase,zona,equipo' });

  if (errorPosiciones) console.error('Error subiendo posiciones:', errorPosiciones.message);
  else console.log(`${filasPosiciones.length} filas de posiciones subidas/actualizadas.`);

  // --- Subir los partidos ---
  if (fs.existsSync('partidos.json')) {
    const partidos = JSON.parse(fs.readFileSync('partidos.json', 'utf-8'));
    // Necesitamos un "id" único por partido, usamos equipo_local+equipo_visitante+fecha
    const filasPartidos = partidos.map(p => ({
      id: `${p.equipo_local}-${p.equipo_visitante}-${p.fecha_hora}`,
      ...p
    }));

    const { error: errorPartidos } = await supabase
      .from('partidos')
      .upsert(filasPartidos, { onConflict: 'id' });

    if (errorPartidos) console.error('Error subiendo partidos:', errorPartidos.message);
    else console.log(`${filasPartidos.length} partidos subidos/actualizados.`);
  }
}

main();
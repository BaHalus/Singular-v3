import { startApp } from '../core/app.js';
import summaryModule from '../modules/summary.module.js';
import attributesModule from '../modules/attributes.module.js';
import traitsModule from '../modules/traits.module.js';
import skillsModule from '../modules/skills.module.js';
import spellsModule from '../modules/spells.module.js';
import equipmentModule from '../modules/equipment.module.js';
import pvpfModule from '../modules/pvpf.module.js';
import ioModule from '../modules/io.module.js';

startApp([
  { id: 'summary', title: 'Resumo do personagem', defaultActive: true, module: summaryModule },
  { id: 'attributes', title: 'Atributos', defaultActive: true, module: attributesModule },
  { id: 'traits', title: 'Traços', defaultActive: true, module: traitsModule },
  { id: 'skills', title: 'Perícias', defaultActive: true, module: skillsModule },
  { id: 'spells', title: 'Magias', defaultActive: true, module: spellsModule },
  { id: 'equipment', title: 'Equipamentos', defaultActive: true, module: equipmentModule },
  { id: 'pvpf', title: 'PV / PF flutuantes', defaultActive: true, module: pvpfModule },
  { id: 'io', title: 'Importação / exportação', defaultActive: true, module: ioModule }
]);

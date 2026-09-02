export function createModuleLoader({ host, floatingRoot, registry, contextFactory }) {
  const loaded = new Map();
  const knownRegistry = [...registry];

  const getDescriptor = (id) => knownRegistry.find((entry) => entry.id === id);

  async function importDescriptor(descriptor) {
    const imported = descriptor.module
      ? descriptor.module
      : await import(new URL(descriptor.path, window.location.href).href);
    const moduleApi = imported.default ?? imported;
    return {
      ...descriptor,
      ...moduleApi,
      id: moduleApi.id ?? descriptor.id,
      title: moduleApi.title ?? descriptor.title
    };
  }

  async function mount(id) {
    if (loaded.has(id)) return loaded.get(id);
    const descriptor = getDescriptor(id);
    if (!descriptor) throw new Error(`Módulo desconhecido: ${id}`);

    const moduleApi = await importDescriptor(descriptor);
    const template = document.getElementById('module-card-template');
    const element = template.content.firstElementChild.cloneNode(true);
    element.dataset.moduleId = id;
    host.appendChild(element);

    const ctx = contextFactory({
      descriptor: moduleApi,
      host: element.querySelector('.module-card__body'),
      floatingRoot
    });

    const cleanup = await moduleApi.mount(ctx);
    const loadedRecord = { descriptor: moduleApi, element, cleanup };
    loaded.set(id, loadedRecord);
    return loadedRecord;
  }

  async function unmount(id) {
    const record = loaded.get(id);
    if (!record) return;
    record.cleanup?.();
    record.element.remove();
    loaded.delete(id);
  }

  async function reload(id) {
    if (!loaded.has(id)) return mount(id);
    await unmount(id);
    return mount(id);
  }

  function register(descriptor) {
    const exists = knownRegistry.some((entry) => entry.id === descriptor.id || entry.path === descriptor.path);
    if (!exists) knownRegistry.push(descriptor);
  }

  function list() {
    return [...knownRegistry];
  }

  function activeIds() {
    return [...loaded.keys()];
  }

  return {
    mount,
    unmount,
    reload,
    register,
    list,
    activeIds
  };
}

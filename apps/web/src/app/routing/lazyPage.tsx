import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type RouteComponent = ComponentType<Record<string, never>>;

export function lazyPage(
  load: () => Promise<unknown>,
  exportName: string,
): LazyExoticComponent<RouteComponent> {
  return lazy(async () => {
    const module = (await load()) as Record<string, unknown>;
    const component = module[exportName];

    if (typeof component !== 'function') {
      throw new Error(`Lazy route export "${exportName}" was not found`);
    }

    return { default: component as RouteComponent };
  });
}

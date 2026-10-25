import { lazy, type ComponentType, type ExoticComponent, type LazyExoticComponent } from 'react';

type RouteComponent = ComponentType<Record<string, never>> | ExoticComponent<Record<string, never>>;

function isRouteComponent(value: unknown): value is RouteComponent {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  );
}

export function lazyPage(
  load: () => Promise<unknown>,
  exportName: string,
): LazyExoticComponent<RouteComponent> {
  return lazy(async () => {
    const module = (await load()) as Record<string, unknown>;
    const component = module[exportName] ?? module.default;

    if (!isRouteComponent(component)) {
      throw new Error(`Lazy route export "${exportName}" was not found`);
    }

    return {
      default: component as ComponentType<Record<string, never>>,
    };
  });
}

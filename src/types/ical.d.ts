declare module 'ical.js' {
  export interface Time {
    isDate: boolean;
    timezone: string | null;
    toJSDate(): Date;
  }

  export interface Event {
    summary: string | null;
    description: string | null;
    location: string | null;
    startDate: Time;
    endDate: Time | null;
  }

  export interface Property {
    getFirstValue(): unknown;
  }

  export interface Component {
    getAllSubcomponents(name: string): Component[];
    getAllProperties(name: string): Property[];
    getFirstPropertyValue(name: string): unknown;
  }

  export function parse(input: string): unknown;

  export class ComponentClass {
    constructor(data: unknown);
    getAllSubcomponents(name: string): ComponentClass[];
    getAllProperties(name: string): PropertyClass[];
    getFirstPropertyValue(name: string): unknown;
  }

  export class EventClass {
    constructor(component: ComponentClass);
    summary: string | null;
    description: string | null;
    location: string | null;
    startDate: Time;
    endDate: Time | null;
  }

  export class PropertyClass {
    getFirstValue(): unknown;
  }

  const ICAL: {
    parse: typeof parse;
    Component: typeof ComponentClass;
    Event: typeof EventClass;
    Property: typeof PropertyClass;
  };

  export default ICAL;
}
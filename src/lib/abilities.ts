import { AbilityBuilder, PureAbility } from '@casl/ability';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subjects = 
  | 'Product' 
  | 'Order' 
  | 'User' 
  | 'Review' 
  | 'Discount' 
  | 'Collection'
  | 'Inventory'
  | 'Settings'
  | 'all';

export type AppAbility = PureAbility<[Actions, Subjects]>;

export const defineAbilitiesFor = (role: string): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(PureAbility);

  if (role === 'admin') {
    // Admins can do everything
    can('manage', 'all');
  } else if (role === 'moderator') {
    // Moderators can manage products, orders, and reviews
    can('manage', 'Product');
    can('manage', 'Order');
    can('manage', 'Review');
    can('read', 'User');
    can('read', 'Discount');
    can('read', 'Collection');
    can('update', 'Inventory');
  } else {
    // Regular users can only read products and manage their own orders
    can('read', 'Product');
    can('read', 'Collection');
    can('read', 'Discount');
    can('create', 'Order');
    can('read', 'Order'); // Own orders only (enforced by RLS)
    can('create', 'Review');
    can('update', 'Review'); // Own reviews only (enforced by RLS)
    can('delete', 'Review'); // Own reviews only (enforced by RLS)
  }

  return build();
};

/** Query description shared by the client API and the server query engine. */

export type WhereOp =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'in'
  | 'not-in'
  | 'array-contains';

export interface WhereClause {
  type: 'where';
  field: string;
  op: WhereOp;
  value: unknown;
}

export interface OrderByClause {
  type: 'orderBy';
  field: string;
  direction: 'asc' | 'desc';
}

export interface LimitClause {
  type: 'limit';
  count: number;
}

export interface StartAtClause {
  type: 'startAt';
  value: unknown;
}

export interface EndAtClause {
  type: 'endAt';
  value: unknown;
}

export type QueryConstraint =
  | WhereClause
  | OrderByClause
  | LimitClause
  | StartAtClause
  | EndAtClause;

export interface QuerySpec {
  collection: string;
  constraints: QueryConstraint[];
}

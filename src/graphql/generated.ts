import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Address: { input: string; output: string };
  DateTime: { input: string; output: string };
  Hash32: { input: any; output: any };
  JSON: { input: unknown; output: unknown };
  _Any: { input: any; output: any };
  federation__FieldSet: { input: any; output: any };
  link__Import: { input: any; output: any };
};

export type AddUserSettingsDto = {
  address?: InputMaybe<Scalars['Address']['input']>;
  email: Scalars['String']['input'];
  isEmailVerified?: InputMaybe<Scalars['String']['input']>;
  notifications_courtV2?: Scalars['Boolean']['input'];
  product?: InputMaybe<SignupProduct>;
  roles?: InputMaybe<Array<Role>>;
};

export type AdminHumanityPaginationInput = {
  orderBy?: AdminHumanitySortField;
  orderDirection?: SortDirection;
  skip?: Scalars['Int']['input'];
  take?: Scalars['Int']['input'];
};

export enum AdminHumanitySortField {
  UpdatedAt = 'UPDATED_AT',
}

export type AdminReferralFilter = {
  createdAtFrom?: InputMaybe<Scalars['DateTime']['input']>;
  createdAtTo?: InputMaybe<Scalars['DateTime']['input']>;
  payoutStatus?: InputMaybe<Array<ReferralPayoutFilter>>;
  refereeHumanityId?: InputMaybe<Scalars['Address']['input']>;
  referrerHumanityId?: InputMaybe<Scalars['Address']['input']>;
  reviewStatus?: InputMaybe<Array<PohReferralReviewStatus>>;
};

export type ConfirmEmailInput = {
  address: Scalars['Address']['input'];
  token: Scalars['String']['input'];
};

export enum CourtV2Deployment {
  Beta = 'Beta',
  Devnet = 'Devnet',
  Testnet = 'Testnet',
  University = 'University',
}

export type CourtV2EvidenceSpamDto = {
  deployment: CourtV2Deployment;
  dispute: Scalars['String']['input'];
  evidenceGroupId: Scalars['String']['input'];
  evidenceIndex: Scalars['String']['input'];
};

export enum PohReferralPayoutTransactionStatus {
  Confirmed = 'Confirmed',
  NotSent = 'NotSent',
  Pending = 'Pending',
}

export enum PohReferralReviewStatus {
  Active = 'Active',
  Approved = 'Approved',
  NeedsReview = 'NeedsReview',
  Rejected = 'Rejected',
}

export enum PohReferralSortField {
  CreatedAt = 'CREATED_AT',
}

export enum Products {
  CourtV1 = 'CourtV1',
  CourtV2 = 'CourtV2',
  Curate = 'Curate',
  Escrow = 'Escrow',
  Foresight = 'Foresight',
  Governor = 'Governor',
  ProofOfHumanity = 'ProofOfHumanity',
  Reality = 'Reality',
  Test = 'Test',
  TokenList = 'TokenList',
}

export type ReferralPaginationInput = {
  orderBy?: PohReferralSortField;
  orderDirection?: SortDirection;
  skip?: Scalars['Int']['input'];
  take?: Scalars['Int']['input'];
};

export enum ReferralPayoutFilter {
  Confirmed = 'Confirmed',
  NotSent = 'NotSent',
  Pending = 'Pending',
  Unassigned = 'Unassigned',
}

export enum Role {
  Admin = 'Admin',
  ForesightAdmin = 'ForesightAdmin',
  PohAdmin = 'PohAdmin',
  Service = 'Service',
  SuperAdmin = 'SuperAdmin',
  User = 'User',
}

export enum Roles {
  CurateItemFile = 'CurateItemFile',
  CurateItemImage = 'CurateItemImage',
  Evidence = 'Evidence',
  ForesightImage = 'ForesightImage',
  ForesightMetadata = 'ForesightMetadata',
  Generic = 'Generic',
  IdentificationVideo = 'IdentificationVideo',
  Logo = 'Logo',
  MetaEvidence = 'MetaEvidence',
  Photo = 'Photo',
  Policy = 'Policy',
  Test = 'Test',
}

export enum SignupProduct {
  CourtV1 = 'CourtV1',
  CourtV2 = 'CourtV2',
  Foresight = 'Foresight',
  PohV2 = 'PohV2',
}

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

export type UpdateNotificationSettingsDto = {
  notifications_courtV2?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateUserSettingsDto = {
  email?: InputMaybe<Scalars['String']['input']>;
  isEmailVerified?: InputMaybe<Scalars['String']['input']>;
  notifications_courtV2?: InputMaybe<Scalars['Boolean']['input']>;
  roles?: InputMaybe<Array<Role>>;
};

export enum Link__Purpose {
  Execution = 'EXECUTION',
  Security = 'SECURITY',
}

export type NonceMutationVariables = Exact<{
  address: Scalars['Address']['input'];
}>;

export type NonceMutation = { __typename?: 'Mutation'; nonce: string };

export type LoginMutationVariables = Exact<{
  message: Scalars['String']['input'];
  signature: Scalars['String']['input'];
}>;

export type LoginMutation = { __typename?: 'Mutation'; login: unknown };

export type FlaggedHumanitiesQueryVariables = Exact<{
  pagination: AdminHumanityPaginationInput;
}>;

export type FlaggedHumanitiesQuery = {
  __typename?: 'Query';
  adminPohFlaggedHumanities: {
    __typename?: 'FlaggedHumanityPage';
    count: number;
    hasNextPage: boolean;
    items: Array<{
      __typename?: 'AdminFlaggedHumanityItem';
      item: {
        __typename?: 'AdminFlaggedHumanity';
        id?: number | null;
        humanityId: string;
        isFlagged: boolean;
        reason: string;
      };
    }>;
  };
};

export type WhitelistedHumanitiesQueryVariables = Exact<{
  pagination: AdminHumanityPaginationInput;
}>;

export type WhitelistedHumanitiesQuery = {
  __typename?: 'Query';
  adminPohWhitelistedHumanities: {
    __typename?: 'WhitelistedHumanityPage';
    count: number;
    hasNextPage: boolean;
    items: Array<{
      __typename?: 'AdminWhitelistedHumanityItem';
      item: {
        __typename?: 'AdminWhitelistedHumanity';
        id?: number | null;
        humanityId: string;
        isWhitelisted: boolean;
        reason: string;
      };
    }>;
  };
};

export type SetHumanityFlagMutationVariables = Exact<{
  humanityId: Scalars['Address']['input'];
  isFlagged: Scalars['Boolean']['input'];
  reason: Scalars['String']['input'];
}>;

export type SetHumanityFlagMutation = {
  __typename?: 'Mutation';
  setHumanityFlagThroughAdmin: { __typename?: 'AdminFlaggedHumanity'; id?: number | null };
};

export type SetMonthlyCapWhitelistMutationVariables = Exact<{
  humanityId: Scalars['Address']['input'];
  isWhitelisted: Scalars['Boolean']['input'];
  reason: Scalars['String']['input'];
}>;

export type SetMonthlyCapWhitelistMutation = {
  __typename?: 'Mutation';
  setPohMonthlyCapWhitelistThroughAdmin: { __typename?: 'AdminWhitelistedHumanity'; id?: number | null };
};

export type ReferralFieldsFragment = {
  __typename?: 'AdminReferral';
  id?: number | null;
  createdAt: string;
  refereeHumanityId: string;
  referrerHumanityId: string;
  reviewStatus: PohReferralReviewStatus;
  reviewReason?: string | null;
  rewardAmount: string;
  payoutTransaction?: {
    __typename?: 'PohReferralPayoutTransaction';
    createdAt: string;
    status: PohReferralPayoutTransactionStatus;
    txHash: any;
  } | null;
  refereeFlag?: { __typename?: 'AdminFlaggedHumanity'; isFlagged: boolean } | null;
  referrerFlag?: { __typename?: 'AdminFlaggedHumanity'; isFlagged: boolean } | null;
};

export type ReferralsQueryVariables = Exact<{
  pagination: ReferralPaginationInput;
  filter?: InputMaybe<AdminReferralFilter>;
}>;

export type ReferralsQuery = {
  __typename?: 'Query';
  adminPohReferrals: {
    __typename?: 'AdminReferralPage';
    count: number;
    hasNextPage: boolean;
    items: Array<{
      __typename?: 'AdminReferralItem';
      item: {
        __typename?: 'AdminReferral';
        id?: number | null;
        createdAt: string;
        refereeHumanityId: string;
        referrerHumanityId: string;
        reviewStatus: PohReferralReviewStatus;
        reviewReason?: string | null;
        rewardAmount: string;
        payoutTransaction?: {
          __typename?: 'PohReferralPayoutTransaction';
          createdAt: string;
          status: PohReferralPayoutTransactionStatus;
          txHash: any;
        } | null;
        refereeFlag?: { __typename?: 'AdminFlaggedHumanity'; isFlagged: boolean } | null;
        referrerFlag?: { __typename?: 'AdminFlaggedHumanity'; isFlagged: boolean } | null;
      };
    }>;
  };
};

export type ReferralCountsQueryVariables = Exact<{ [key: string]: never }>;

export type ReferralCountsQuery = {
  __typename?: 'Query';
  total: { __typename?: 'AdminReferralPage'; count: number };
  needsReview: { __typename?: 'AdminReferralPage'; count: number };
  active: { __typename?: 'AdminReferralPage'; count: number };
  approved: { __typename?: 'AdminReferralPage'; count: number };
  rejected: { __typename?: 'AdminReferralPage'; count: number };
  unassigned: { __typename?: 'AdminReferralPage'; count: number };
  notSent: { __typename?: 'AdminReferralPage'; count: number };
  pending: { __typename?: 'AdminReferralPage'; count: number };
  confirmed: { __typename?: 'AdminReferralPage'; count: number };
};

export type ReferralActivityCountsQueryVariables = Exact<{
  todayFrom: Scalars['DateTime']['input'];
  monthFrom: Scalars['DateTime']['input'];
}>;

export type ReferralActivityCountsQuery = {
  __typename?: 'Query';
  today: { __typename?: 'AdminReferralPage'; count: number };
  thisMonth: { __typename?: 'AdminReferralPage'; count: number };
};

export type UpdateReviewStatusMutationVariables = Exact<{
  refereeHumanityId: Scalars['Address']['input'];
  reviewStatus: PohReferralReviewStatus;
  reason: Scalars['String']['input'];
}>;

export type UpdateReviewStatusMutation = {
  __typename?: 'Mutation';
  updatePohReferralReviewStatusThroughAdmin: { __typename?: 'AdminReferral'; id?: number | null };
};

export const ReferralFieldsFragmentDoc = gql`
  fragment ReferralFields on AdminReferral {
    id
    createdAt
    refereeHumanityId
    referrerHumanityId
    reviewStatus
    reviewReason
    rewardAmount
    payoutTransaction {
      createdAt
      status
      txHash
    }
    refereeFlag {
      isFlagged
    }
    referrerFlag {
      isFlagged
    }
  }
`;
export const NonceDocument = gql`
  mutation Nonce($address: Address!) {
    nonce(address: $address)
  }
`;
export const LoginDocument = gql`
  mutation Login($message: String!, $signature: String!) {
    login(message: $message, signature: $signature)
  }
`;
export const FlaggedHumanitiesDocument = gql`
  query FlaggedHumanities($pagination: AdminHumanityPaginationInput!) {
    adminPohFlaggedHumanities(pagination: $pagination) {
      count
      hasNextPage
      items {
        item {
          id
          humanityId
          isFlagged
          reason
        }
      }
    }
  }
`;
export const WhitelistedHumanitiesDocument = gql`
  query WhitelistedHumanities($pagination: AdminHumanityPaginationInput!) {
    adminPohWhitelistedHumanities(pagination: $pagination) {
      count
      hasNextPage
      items {
        item {
          id
          humanityId
          isWhitelisted
          reason
        }
      }
    }
  }
`;
export const SetHumanityFlagDocument = gql`
  mutation SetHumanityFlag($humanityId: Address!, $isFlagged: Boolean!, $reason: String!) {
    setHumanityFlagThroughAdmin(humanityId: $humanityId, isFlagged: $isFlagged, reason: $reason) {
      id
    }
  }
`;
export const SetMonthlyCapWhitelistDocument = gql`
  mutation SetMonthlyCapWhitelist($humanityId: Address!, $isWhitelisted: Boolean!, $reason: String!) {
    setPohMonthlyCapWhitelistThroughAdmin(humanityId: $humanityId, isWhitelisted: $isWhitelisted, reason: $reason) {
      id
    }
  }
`;
export const ReferralsDocument = gql`
  query Referrals($pagination: ReferralPaginationInput!, $filter: AdminReferralFilter) {
    adminPohReferrals(pagination: $pagination, filter: $filter) {
      count
      hasNextPage
      items {
        item {
          ...ReferralFields
        }
      }
    }
  }
  ${ReferralFieldsFragmentDoc}
`;
export const ReferralCountsDocument = gql`
  query ReferralCounts {
    total: adminPohReferrals(pagination: { take: 1 }) {
      count
    }
    needsReview: adminPohReferrals(pagination: { take: 1 }, filter: { reviewStatus: [NeedsReview] }) {
      count
    }
    active: adminPohReferrals(pagination: { take: 1 }, filter: { reviewStatus: [Active] }) {
      count
    }
    approved: adminPohReferrals(pagination: { take: 1 }, filter: { reviewStatus: [Approved] }) {
      count
    }
    rejected: adminPohReferrals(pagination: { take: 1 }, filter: { reviewStatus: [Rejected] }) {
      count
    }
    unassigned: adminPohReferrals(pagination: { take: 1 }, filter: { payoutStatus: [Unassigned] }) {
      count
    }
    notSent: adminPohReferrals(pagination: { take: 1 }, filter: { payoutStatus: [NotSent] }) {
      count
    }
    pending: adminPohReferrals(pagination: { take: 1 }, filter: { payoutStatus: [Pending] }) {
      count
    }
    confirmed: adminPohReferrals(pagination: { take: 1 }, filter: { payoutStatus: [Confirmed] }) {
      count
    }
  }
`;
export const ReferralActivityCountsDocument = gql`
  query ReferralActivityCounts($todayFrom: DateTime!, $monthFrom: DateTime!) {
    today: adminPohReferrals(pagination: { take: 1 }, filter: { createdAtFrom: $todayFrom }) {
      count
    }
    thisMonth: adminPohReferrals(pagination: { take: 1 }, filter: { createdAtFrom: $monthFrom }) {
      count
    }
  }
`;
export const UpdateReviewStatusDocument = gql`
  mutation UpdateReviewStatus($refereeHumanityId: Address!, $reviewStatus: PohReferralReviewStatus!, $reason: String!) {
    updatePohReferralReviewStatusThroughAdmin(
      refereeHumanityId: $refereeHumanityId
      reviewStatus: $reviewStatus
      reason: $reason
    ) {
      id
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    Nonce(
      variables: NonceMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<NonceMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<NonceMutation>({
            document: NonceDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'Nonce',
        'mutation',
        variables,
      );
    },
    Login(
      variables: LoginMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<LoginMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<LoginMutation>({
            document: LoginDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'Login',
        'mutation',
        variables,
      );
    },
    FlaggedHumanities(
      variables: FlaggedHumanitiesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<FlaggedHumanitiesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<FlaggedHumanitiesQuery>({
            document: FlaggedHumanitiesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'FlaggedHumanities',
        'query',
        variables,
      );
    },
    WhitelistedHumanities(
      variables: WhitelistedHumanitiesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<WhitelistedHumanitiesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<WhitelistedHumanitiesQuery>({
            document: WhitelistedHumanitiesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'WhitelistedHumanities',
        'query',
        variables,
      );
    },
    SetHumanityFlag(
      variables: SetHumanityFlagMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetHumanityFlagMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetHumanityFlagMutation>({
            document: SetHumanityFlagDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetHumanityFlag',
        'mutation',
        variables,
      );
    },
    SetMonthlyCapWhitelist(
      variables: SetMonthlyCapWhitelistMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetMonthlyCapWhitelistMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetMonthlyCapWhitelistMutation>({
            document: SetMonthlyCapWhitelistDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetMonthlyCapWhitelist',
        'mutation',
        variables,
      );
    },
    Referrals(
      variables: ReferralsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ReferralsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ReferralsQuery>({
            document: ReferralsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'Referrals',
        'query',
        variables,
      );
    },
    ReferralCounts(
      variables?: ReferralCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ReferralCountsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ReferralCountsQuery>({
            document: ReferralCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ReferralCounts',
        'query',
        variables,
      );
    },
    ReferralActivityCounts(
      variables: ReferralActivityCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ReferralActivityCountsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ReferralActivityCountsQuery>({
            document: ReferralActivityCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ReferralActivityCounts',
        'query',
        variables,
      );
    },
    UpdateReviewStatus(
      variables: UpdateReviewStatusMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateReviewStatusMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<UpdateReviewStatusMutation>({
            document: UpdateReviewStatusDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'UpdateReviewStatus',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;

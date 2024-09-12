export interface PaginationParamsOrder {
  direction: "ASC" | "DESC";
  field: string;
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
  order?: string[];
  // Optional Cursor based pagination
  cursorDate?: Date;
  cursorId?: string;
  // Custom ordering
  direction?: ("ASC" | "DESC")[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number; // total number of records
  currentPage: number; // This will represent the current page number
  pageSize: number; // This will represent the number of records per page
  totalPages: number; // This will represent the total number of pages
  // Optional for cursor-based pagination
  cursorId?: string;
  cursorDate?: Date;
}

export interface Speaker {
  speaker_id?: string;
  name?: string;
  email?: string;
  tags?: Tag[];
  current_embedding?: number[];
  current_weight?: number;
  tag_ids?: string[]; // Array of tag IDs
  context?: string | null;
  created_at?: Date | string;
  user_id?: string;
}

export interface FindSpeakers extends PaginationParams {
  name?: string;
  email?: string;
  context?: string;
}

export interface CreateSpeaker {
  name: string;
  email: string;
  context?: string;
  tag_ids?: string[];
}

export interface UpdateSpeaker extends Partial<CreateSpeaker> {
  id: string; // The only required field for updating a speaker
}

export interface Tag {
  tag_id: string;
  name: string;
  slug: string;
  created_at?: Date | string;
  user_id?: string;
}

export interface TagCreate {
  name: string;
}

export interface TagUpdate {
  name: string;
}

export interface FindTags extends PaginationParams {
  name?: string;
}

export const allSpeakers: Speaker[] = [
  {
    context: null,
    created_at: "2024-08-12T15:27:06.066072",
    current_weight: 162.0,
    email: "bjorn@bjorn.co",
    name: "bjorn",
    speaker_id: "24d8bb38-7bc2-4ecf-ab8f-b803e410d73a",
    tags: [],
    user_id: "c9f65e7b-b084-406c-b2c0-ce0c692cd378",
  },
  {
    context: null,
    created_at: "2024-08-12T15:27:06.066072",
    current_weight: 138.0,
    email: "chris@chris.com",
    name: "chrisdfdfaaaaaa",
    speaker_id: "e3781568-6bb2-4789-b15c-84ee5f370f14",
    tags: [],
    user_id: "c9f65e7b-b084-406c-b2c0-ce0c692cd378",
  },
  {
    context: null,
    created_at: "2024-08-12T14:34:42.866567",
    current_weight: 0.0,
    email: "lex@lex.com",
    name: "lexinthefture",
    speaker_id: "877537d5-63fb-4b67-9063-82276af81bd3",
    tags: [
      {
        created_at: "2024-09-01T00:50:03.528345",
        name: "sdfzzzzsdfsdf",
        slug: "sdfzzzzsdfsdf",
        tag_id: "2792780f-a70f-4ee4-99f2-087baee1c535",
        user_id: "c9f65e7b-b084-406c-b2c0-ce0c692cd378",
      },
    ],
    user_id: "c9f65e7b-b084-406c-b2c0-ce0c692cd378",
  },
  {
    context: null,
    created_at: "2024-08-12T15:27:06.066072",
    current_weight: 67.0,
    email: "andrea@andrea.com",
    name: "andreainthefutre",
    speaker_id: "39a27607-a253-41e1-a4d5-92c70624a608",
    tags: [],
    user_id: "c9f65e7b-b084-406c-b2c0-ce0c692cd378",
  },
  {
    context: "",
    created_at: "2024-09-01T13:33:18.356802",
    current_weight: 0.0,
    email: "abreton@heelo.com",
    name: "hello",
    speaker_id: "3975c93f-5519-4a32-98e8-346e76c0010f",
    tags: [],
    user_id: "c9f65e7b-b084-406c-b2c0-ce0c692cd378",
  },
];

export const allTags: Tag[] = [
  {
    created_at: "2024-09-01T00:50:03.528345",
    name: "sdfzzzzsdfsdf",
    slug: "sdfzzzzsdfsdf",
    tag_id: "2792780f-a70f-4ee4-99f2-087baee1c535",
    user_id: "c9f65e7b-b084-406c-b2c0-ce0c692cd378",
  },
];

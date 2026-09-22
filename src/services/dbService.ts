import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  SEED_COURSE_MODULES,
  SEED_LESSONS,
  SEED_LESSON_RUBRICS,
  SEED_LESSON_RESOURCES
} from '../data/curriculumSeed';
import { 
  DbUser, 
  DbClient, 
  DbCourse, 
  DbCourseModule,
  DbLesson,
  DbLessonRubricCriterion,
  DbLessonResource,
  CourseCurriculumModule,
  DbClass, 
  DbLearner, 
  DbEnrollment, 
  DbPromptAttempt,
  AiEvaluationResult,
  ClassWithDetails, 
  LearnerInClassDetail, 
  LearnerActiveEnrollmentView,
  UserRole,
  EnrollmentStatus
} from '../types/database';

// ==============================================================================
// SEED DATA BAN ĐẦU CHO LOCAL STORAGE / FALLBACK ADAPTER
// (Khớp chính xác với supabase/schema.sql)
// ==============================================================================

const INITIAL_USERS: DbUser[] = [
  { id: '00000000-0000-0000-0000-000000000001', email: 'nam.nh@agribank.com.vn', full_name: 'Nguyễn Hoàng Nam', role: 'instructor' },
  { id: '00000000-0000-0000-0000-000000000002', email: 'linh.pham@agribank.com.vn', full_name: 'Linh Phạm', role: 'learner' },
  { id: '00000000-0000-0000-0000-000000000003', email: 'minh.tran@agribank.com.vn', full_name: 'Minh Trần', role: 'learner' },
  { id: '00000000-0000-0000-0000-000000000004', email: 'phuong.nguyen@enterprise.com', full_name: 'Phương Nguyễn', role: 'learner' },
];

const INITIAL_CLIENTS: DbClient[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Agribank Việt Nam', industry: 'Ngân hàng & Tài chính' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Enterprise Business Users', industry: 'Doanh nghiệp & Dịch vụ' },
];

const INITIAL_COURSES: DbCourse[] = [
  {
    id: '33333333-3333-3333-3333-333333333331',
    title: 'Prompt Engineering for Business Users & Non-techs',
    description: 'Chương trình chuẩn hóa kỹ năng điều khiển AI cho cán bộ văn phòng: Viết prompt có cấu trúc, trích xuất bảng Markdown và chống ảo giác.',
    status: 'active',
    slug: 'prompt-engineering-business-nontechs',
    publication_status: 'published',
    version: 2,
    created_by: '00000000-0000-0000-0000-000000000001',
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    title: 'AI Thẩm định & Phân tích Tín dụng Doanh nghiệp',
    description: 'Ứng dụng Prompting trong tóm tắt hồ sơ vay vốn, phân tích báo cáo tài chính và trích xuất chỉ số rủi ro.',
    status: 'active',
    slug: 'ai-tham-dinh-tin-dung-doanh-nghiep',
    publication_status: 'published',
    version: 1,
    created_by: '00000000-0000-0000-0000-000000000001',
  },
];

const INITIAL_CLASSES: DbClass[] = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    class_code: 'AGRI-COMM-2026-01',
    course_id: '33333333-3333-3333-3333-333333333331',
    client_id: '11111111-1111-1111-1111-111111111111',
    department: 'Ban Truyền thông & Thương hiệu',
    start_date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    class_code: 'AGRI-CREDIT-2026-02',
    course_id: '33333333-3333-3333-3333-333333333332',
    client_id: '11111111-1111-1111-1111-111111111111',
    department: 'Khối Quản lý & Thẩm định Tín dụng',
    start_date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: '44444444-4444-4444-4444-444444444443',
    class_code: 'CORP-GEN-2026-03',
    course_id: '33333333-3333-3333-3333-333333333331',
    client_id: '22222222-2222-2222-2222-222222222222',
    department: 'Văn phòng Tổng hợp & CSKH',
    start_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    status: 'upcoming',
  },
];

const INITIAL_LEARNERS: DbLearner[] = [
  { id: '55555555-5555-5555-5555-555555555551', learner_code: 'LRN-000001', user_id: '00000000-0000-0000-0000-000000000002' },
  { id: '55555555-5555-5555-5555-555555555552', learner_code: 'LRN-000002', user_id: '00000000-0000-0000-0000-000000000003' },
  { id: '55555555-5555-5555-5555-555555555553', learner_code: 'LRN-000003', user_id: '00000000-0000-0000-0000-000000000004' },
];

const INITIAL_ENROLLMENTS: DbEnrollment[] = [
  { id: '66666666-6666-6666-6666-666666666661', learner_id: '55555555-5555-5555-5555-555555555551', class_id: '44444444-4444-4444-4444-444444444441', status: 'active' },
  { id: '66666666-6666-6666-6666-666666666662', learner_id: '55555555-5555-5555-5555-555555555552', class_id: '44444444-4444-4444-4444-444444444442', status: 'active' },
  { id: '66666666-6666-6666-6666-666666666663', learner_id: '55555555-5555-5555-5555-555555555553', class_id: '44444444-4444-4444-4444-444444444443', status: 'active' },
];

// ==============================================================================
// LOCAL STORAGE HELPER CHO PROMPTIFY DB REPOSITORY
// ==============================================================================

class LocalDbStore {
  private memoryFallback: Record<string, string> = {};

  private get<T>(key: string, fallback: T): T {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(`promptify_db_${key}`);
        if (saved) return JSON.parse(saved);
      }
      const mem = this.memoryFallback[`promptify_db_${key}`];
      return mem ? JSON.parse(mem) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, data: T): void {
    try {
      const serialized = JSON.stringify(data);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`promptify_db_${key}`, serialized);
      }
      this.memoryFallback[`promptify_db_${key}`] = serialized;
    } catch {
      // Storage full or private mode
    }
  }

  getUsers(): DbUser[] { return this.get('users', INITIAL_USERS); }
  setUsers(users: DbUser[]) { this.set('users', users); }

  getClients(): DbClient[] { return this.get('clients', INITIAL_CLIENTS); }

  getCourses(): DbCourse[] { return this.get('courses', INITIAL_COURSES); }
  setCourses(courses: DbCourse[]) { this.set('courses', courses); }

  getCourseModules(): DbCourseModule[] { return this.get('course_modules', SEED_COURSE_MODULES); }
  setCourseModules(modules: DbCourseModule[]) { this.set('course_modules', modules); }

  getLessons(): DbLesson[] { return this.get('lessons', SEED_LESSONS); }
  setLessons(lessons: DbLesson[]) { this.set('lessons', lessons); }

  getLessonRubrics(): DbLessonRubricCriterion[] { return this.get('lesson_rubrics', SEED_LESSON_RUBRICS); }
  setLessonRubrics(criteria: DbLessonRubricCriterion[]) { this.set('lesson_rubrics', criteria); }

  getLessonResources(): DbLessonResource[] { return this.get('lesson_resources', SEED_LESSON_RESOURCES); }
  setLessonResources(resources: DbLessonResource[]) { this.set('lesson_resources', resources); }

  getClasses(): DbClass[] { return this.get('classes', INITIAL_CLASSES); }
  setClasses(classes: DbClass[]) { this.set('classes', classes); }

  getLearners(): DbLearner[] { return this.get('learners', INITIAL_LEARNERS); }
  setLearners(learners: DbLearner[]) { this.set('learners', learners); }

  getEnrollments(): DbEnrollment[] { return this.get('enrollments', INITIAL_ENROLLMENTS); }
  setEnrollments(enrollments: DbEnrollment[]) { this.set('enrollments', enrollments); }

  getNextLearnerCode(): string {
    const learners = this.getLearners();
    const nextNum = learners.length + 1;
    return `LRN-${String(nextNum).padStart(6, '0')}`;
  }

  getPromptAttempts(): DbPromptAttempt[] {
    return this.get<DbPromptAttempt[]>('prompt_attempts', []);
  }

  setPromptAttempts(attempts: DbPromptAttempt[]): void {
    this.set('prompt_attempts', attempts);
  }
}

const localStore = new LocalDbStore();

// ==============================================================================
// DUAL-MODE REPOSITORY SERVICE (SUPABASE POSTGRESQL + LOCAL STORE ADAPTER)
// ==============================================================================

export const dbService = {
  async hasCompletedTutorial(userId: string, tutorialKey: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { data, error } = await supabase
      .from('user_tutorial_progress')
      .select('tutorial_key')
      .eq('user_id', userId)
      .eq('tutorial_key', tutorialKey)
      .maybeSingle();
    if (error) throw new Error(`Lỗi tải trạng thái hướng dẫn: ${error.message}`);
    return Boolean(data);
  },

  async completeTutorial(userId: string, tutorialKey: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('user_tutorial_progress')
      .upsert(
        { user_id: userId, tutorial_key: tutorialKey, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,tutorial_key' },
      );
    if (error) throw new Error(`Lỗi lưu trạng thái hướng dẫn: ${error.message}`);
  },

  // ----------------------------------------------------------------------------
  // P0.2 — USERS & AUTH & ROLE ROUTING
  // ----------------------------------------------------------------------------

  /**
   * Lấy User từ DB theo Email
   */
  async getUserByEmail(email: string): Promise<DbUser | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (!error && data) return data as DbUser;
    }
    const users = localStore.getUsers();
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  },

  /**
   * Xác định role thật từ DB: learner | instructor | admin
   */
  async getUserRole(email: string): Promise<UserRole | null> {
    const user = await this.getUserByEmail(email);
    return user ? user.role : null;
  },

  /**
   * Xử lý đăng nhập OAuth:
   * 1. Tìm user bằng email
   * 2. Nếu chưa có: tạo user role=learner (không tự cấp instructor role)
   * 3. Tạo record learner và LearnerID nếu chưa có
   */
  async syncUserFromOAuth(payload: { email: string; full_name?: string; auth_provider_id?: string }): Promise<DbUser> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const name = payload.full_name?.trim() || normalizedEmail.split('@')[0];

    if (isSupabaseConfigured) {
      // 1. Tìm user theo email
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (findError) {
        console.error('[dbService] Error finding user in Supabase:', findError);
      }

      let user: DbUser;
      if (existingUser) {
        user = existingUser as DbUser;
        // Bổ sung auth_provider_id hoặc full_name từ OAuth nếu chưa có trong DB
        const updates: Partial<DbUser> = {};
        if (!user.auth_provider_id && payload.auth_provider_id) {
          updates.auth_provider_id = payload.auth_provider_id;
        }
        if ((!user.full_name || user.full_name === normalizedEmail.split('@')[0]) && payload.full_name) {
          updates.full_name = payload.full_name.trim();
        }
        if (Object.keys(updates).length > 0) {
          try {
            const { data: updated } = await supabase
              .from('users')
              .update(updates)
              .eq('id', user.id)
              .select()
              .maybeSingle();
            if (updated) user = updated as DbUser;
          } catch (e) {
            console.warn('[dbService] Non-critical user update issue:', e);
          }
        }
      } else {
        // 2. Tạo user mới với role=learner (Database trigger ngăn không cho tự gán role khác)
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: normalizedEmail,
            full_name: name,
            role: 'learner',
            auth_provider_id: payload.auth_provider_id || null,
          })
          .select()
          .single();

        if (userError || !newUser) {
          throw new Error(`Không thể tạo user: ${userError?.message}`);
        }
        user = newUser as DbUser;
      }

      // 3. Phân biệt rõ theo vai trò (Role-based separation):
      // - role = instructor | admin: KHÔNG tự tạo learner record, đồng thời dọn dẹp record cũ nếu có
      // - role = learner: Tìm hoặc tạo mới learner record (chưa có enrollment)
      if (user.role === 'instructor' || user.role === 'admin') {
        try {
          await supabase
            .from('learners')
            .delete()
            .eq('user_id', user.id);
        } catch {
          // Bỏ qua nếu không có bản ghi hoặc hạn chế quyền
        }
      } else if (user.role === 'learner') {
        const { data: existingLearner } = await supabase
          .from('learners')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingLearner) {
          await supabase
            .from('learners')
            .insert({ user_id: user.id });
        }
      }

      return user;
    }

    // Local fallback store
    const users = localStore.getUsers();
    let user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        email: normalizedEmail,
        full_name: name,
        role: 'learner',
        auth_provider_id: payload.auth_provider_id || null,
        created_at: new Date().toISOString(),
      };
      users.push(user);
      localStore.setUsers(users);
    }

    if (user.role === 'instructor' || user.role === 'admin') {
      const learners = localStore.getLearners();
      const filtered = learners.filter(l => l.user_id !== user!.id);
      if (filtered.length !== learners.length) {
        localStore.setLearners(filtered);
      }
    } else if (user.role === 'learner') {
      const learners = localStore.getLearners();
      let learner = learners.find(l => l.user_id === user!.id);
      if (!learner) {
        learner = {
          id: `learner-${Date.now()}`,
          learner_code: localStore.getNextLearnerCode(),
          user_id: user.id,
          created_at: new Date().toISOString(),
        };
        learners.push(learner);
        localStore.setLearners(learners);
      }
    }

    return user;
  },

  // ----------------------------------------------------------------------------
  // P0.3 — CLASS TRACKING: ClassID -> Course -> Client / Company -> Industry
  // ----------------------------------------------------------------------------

  /**
   * Lấy danh sách lớp học kèm đầy đủ thông tin Course, Client, Industry và Learner Count
   */
  async getClassesWithDetails(): Promise<ClassWithDetails[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          course:courses(*),
          client:clients(*),
          enrollments(id, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Lỗi tải danh sách lớp được cấp quyền: ${error.message}`);
      return (data || []).map((item: any) => ({
        id: item.id,
        class_code: item.class_code,
        course_id: item.course_id,
        client_id: item.client_id,
        department: item.department,
        start_date: item.start_date,
        end_date: item.end_date,
        status: item.status,
        created_at: item.created_at,
        course: item.course,
        client: item.client,
        learner_count: (item.enrollments || []).filter((e: any) => e.status !== 'removed').length,
      }));
    }

    // Local fallback store
    const classes = localStore.getClasses();
    const courses = localStore.getCourses();
    const clients = localStore.getClients();
    const enrollments = localStore.getEnrollments();

    return classes.map((cls) => {
      const course = courses.find(c => c.id === cls.course_id) || {
        id: cls.course_id,
        title: 'Khóa học chưa đặt tên',
        description: null,
        status: 'active',
        created_by: null,
      };
      const client = clients.find(c => c.id === cls.client_id) || {
        id: cls.client_id,
        name: 'Doanh nghiệp đối tác',
        industry: 'Tài chính & Dịch vụ',
      };
      const learner_count = enrollments.filter(e => e.class_id === cls.id && e.status !== 'removed').length;

      return {
        ...cls,
        course,
        client,
        learner_count,
      };
    });
  },

  /**
   * Lấy chi tiết 1 lớp học kèm Course và Client
   */
  async getClassDetail(classId: string): Promise<ClassWithDetails | null> {
    const list = await this.getClassesWithDetails();
    return list.find(c => c.id === classId || c.class_code === classId) || null;
  },

  // ----------------------------------------------------------------------------
  // P0.5 — COURSE CRUD
  // ----------------------------------------------------------------------------

  async getCourses(): Promise<DbCourse[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data as DbCourse[];
    }
    return localStore.getCourses();
  },

  async createCourse(data: { title: string; description?: string; created_by?: string }): Promise<DbCourse> {
    if (isSupabaseConfigured) {
      const { data: newCourse, error } = await supabase
        .from('courses')
        .insert({
          title: data.title.trim(),
          description: data.description?.trim() || null,
          status: 'active',
          publication_status: 'draft',
          version: 1,
          created_by: data.created_by || null,
        })
        .select()
        .single();
      if (error || !newCourse) throw new Error(`Lỗi tạo khóa học: ${error?.message}`);
      return newCourse as DbCourse;
    }

    const courses = localStore.getCourses();
    const newCourse: DbCourse = {
      id: `course-${Date.now()}`,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: 'active',
      publication_status: 'draft',
      version: 1,
      created_by: data.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    courses.unshift(newCourse);
    localStore.setCourses(courses);
    return newCourse;
  },

  async updateCourse(id: string, data: Partial<DbCourse>): Promise<DbCourse> {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase
        .from('courses')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error || !updated) throw new Error(`Lỗi cập nhật khóa học: ${error?.message}`);
      return updated as DbCourse;
    }

    const courses = localStore.getCourses();
    const idx = courses.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Khóa học không tồn tại');
    courses[idx] = { ...courses[idx], ...data, updated_at: new Date().toISOString() };
    localStore.setCourses(courses);
    return courses[idx];
  },

  /**
   * Delete / Archive Course:
   * Không hard-delete Course nếu đã có Class sử dụng.
   * Khi Course đã được dùng: status = 'archived' và trả về thông báo.
   */
  async archiveOrDeleteCourse(id: string): Promise<{ success: boolean; isArchived: boolean; action: 'archived' | 'deleted'; message: string }> {
    // 1. Kiểm tra xem Course có đang được Class nào sử dụng không
    let isUsedByClass = false;

    if (isSupabaseConfigured) {
      const { data: usedClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('course_id', id);
      isUsedByClass = Boolean(usedClasses && usedClasses.length > 0);
    } else {
      const classes = localStore.getClasses();
      isUsedByClass = classes.some(c => c.course_id === id);
    }

    if (isUsedByClass) {
      // Khóa học đang được dùng -> Lưu trữ (Archived) thay vì xóa
      await this.updateCourse(id, { status: 'archived', publication_status: 'archived' });
      return {
        success: true,
        isArchived: true,
        action: 'archived',
        message: 'Khóa học này đang được sử dụng bởi lớp học. Bạn có thể lưu trữ thay vì xóa.',
      };
    } else {
      // Khóa học chưa từng được lớp nào dùng -> Cho phép xóa hoặc archive
      if (isSupabaseConfigured) {
        await supabase.from('courses').delete().eq('id', id);
      } else {
        const courses = localStore.getCourses().filter(c => c.id !== id);
        localStore.setCourses(courses);
      }
      return {
        success: true,
        isArchived: false,
        action: 'deleted',
        message: 'Đã xóa khóa học thành công.',
      };
    }
  },

  // ----------------------------------------------------------------------------
  // COURSE CURRICULUM: MODULES -> LESSONS -> RUBRICS / RESOURCES
  // ----------------------------------------------------------------------------

  async getCourseCurriculum(courseId: string): Promise<CourseCurriculumModule[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons (
            *,
            rubric_criteria:lesson_rubric_criteria(*),
            resources:lesson_resources(*)
          )
        `)
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (error) throw new Error(`Lỗi tải nội dung khóa học: ${error.message}`);

      return ((data || []) as any[]).map((module) => ({
        ...module,
        lessons: (module.lessons || [])
          .map((lesson: any) => ({
            ...lesson,
            hints: Array.isArray(lesson.hints) ? lesson.hints : [],
            focus_components: Array.isArray(lesson.focus_components) ? lesson.focus_components : [],
            rubric_criteria: [...(lesson.rubric_criteria || [])].sort((a, b) => a.position - b.position),
            resources: [...(lesson.resources || [])].sort((a, b) => a.position - b.position),
          }))
          .sort((a: DbLesson, b: DbLesson) => a.position - b.position),
      })) as CourseCurriculumModule[];
    }

    const modules = localStore.getCourseModules().filter((module) => module.course_id === courseId);
    const lessons = localStore.getLessons();
    const rubrics = localStore.getLessonRubrics();
    const resources = localStore.getLessonResources();
    return modules
      .map((module) => ({
        ...module,
        lessons: lessons
          .filter((lesson) => lesson.module_id === module.id)
          .map((lesson) => ({
            ...lesson,
            rubric_criteria: rubrics.filter((criterion) => criterion.lesson_id === lesson.id).sort((a, b) => a.position - b.position),
            resources: resources.filter((resource) => resource.lesson_id === lesson.id).sort((a, b) => a.position - b.position),
          }))
          .sort((a, b) => a.position - b.position),
      }))
      .sort((a, b) => a.position - b.position);
  },

  async createCourseModule(data: Omit<DbCourseModule, 'id' | 'created_at' | 'updated_at'>): Promise<DbCourseModule> {
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.from('course_modules').insert(data).select().single();
      if (error || !created) throw new Error(`Lỗi tạo chương: ${error?.message}`);
      return created as DbCourseModule;
    }
    const now = new Date().toISOString();
    const created: DbCourseModule = { ...data, id: `module-${Date.now()}-${Math.random().toString(36).slice(2)}`, created_at: now, updated_at: now };
    localStore.setCourseModules([...localStore.getCourseModules(), created]);
    return created;
  },

  async updateCourseModule(id: string, data: Partial<Omit<DbCourseModule, 'id' | 'course_id'>>): Promise<DbCourseModule> {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('course_modules').update(data).eq('id', id).select().single();
      if (error || !updated) throw new Error(`Lỗi cập nhật chương: ${error?.message}`);
      return updated as DbCourseModule;
    }
    const modules = localStore.getCourseModules();
    const index = modules.findIndex((module) => module.id === id);
    if (index < 0) throw new Error('Chương không tồn tại');
    modules[index] = { ...modules[index], ...data, updated_at: new Date().toISOString() };
    localStore.setCourseModules(modules);
    return modules[index];
  },

  async deleteCourseModule(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('course_modules').delete().eq('id', id);
      if (error) throw new Error(`Lỗi xóa chương: ${error.message}`);
      return;
    }
    const lessonIds = new Set(localStore.getLessons().filter((lesson) => lesson.module_id === id).map((lesson) => lesson.id));
    localStore.setCourseModules(localStore.getCourseModules().filter((module) => module.id !== id));
    localStore.setLessons(localStore.getLessons().filter((lesson) => lesson.module_id !== id));
    localStore.setLessonRubrics(localStore.getLessonRubrics().filter((criterion) => !lessonIds.has(criterion.lesson_id)));
    localStore.setLessonResources(localStore.getLessonResources().filter((resource) => !lessonIds.has(resource.lesson_id)));
  },

  async createLesson(data: Omit<DbLesson, 'id' | 'created_at' | 'updated_at'>): Promise<DbLesson> {
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.from('lessons').insert(data).select().single();
      if (error || !created) throw new Error(`Lỗi tạo bài học: ${error?.message}`);
      return created as DbLesson;
    }
    const now = new Date().toISOString();
    const created: DbLesson = { ...data, id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2)}`, created_at: now, updated_at: now };
    localStore.setLessons([...localStore.getLessons(), created]);
    return created;
  },

  async updateLesson(id: string, data: Partial<Omit<DbLesson, 'id' | 'module_id'>>): Promise<DbLesson> {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase.from('lessons').update(data).eq('id', id).select().single();
      if (error || !updated) throw new Error(`Lỗi cập nhật bài học: ${error?.message}`);
      return updated as DbLesson;
    }
    const lessons = localStore.getLessons();
    const index = lessons.findIndex((lesson) => lesson.id === id);
    if (index < 0) throw new Error('Bài học không tồn tại');
    lessons[index] = { ...lessons[index], ...data, updated_at: new Date().toISOString() };
    localStore.setLessons(lessons);
    return lessons[index];
  },

  async deleteLesson(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw new Error(`Lỗi xóa bài học: ${error.message}`);
      return;
    }
    localStore.setLessons(localStore.getLessons().filter((lesson) => lesson.id !== id));
    localStore.setLessonRubrics(localStore.getLessonRubrics().filter((criterion) => criterion.lesson_id !== id));
    localStore.setLessonResources(localStore.getLessonResources().filter((resource) => resource.lesson_id !== id));
  },

  async replaceLessonRubrics(lessonId: string, criteria: Array<Omit<DbLessonRubricCriterion, 'id' | 'lesson_id' | 'created_at' | 'updated_at'>>): Promise<DbLessonRubricCriterion[]> {
    if (isSupabaseConfigured) {
      const { error: deleteError } = await supabase.from('lesson_rubric_criteria').delete().eq('lesson_id', lessonId);
      if (deleteError) throw new Error(`Lỗi cập nhật rubric: ${deleteError.message}`);
      if (criteria.length === 0) return [];
      const { data, error } = await supabase
        .from('lesson_rubric_criteria')
        .insert(criteria.map((criterion) => ({ ...criterion, lesson_id: lessonId })))
        .select();
      if (error) throw new Error(`Lỗi cập nhật rubric: ${error.message}`);
      return (data || []) as DbLessonRubricCriterion[];
    }
    const retained = localStore.getLessonRubrics().filter((criterion) => criterion.lesson_id !== lessonId);
    const created = criteria.map((criterion, index) => ({
      ...criterion,
      id: `rubric-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      lesson_id: lessonId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    localStore.setLessonRubrics([...retained, ...created]);
    return created;
  },

  async replaceLessonResources(lessonId: string, resources: Array<Omit<DbLessonResource, 'id' | 'lesson_id' | 'created_at' | 'updated_at'>>): Promise<DbLessonResource[]> {
    if (isSupabaseConfigured) {
      const { error: deleteError } = await supabase.from('lesson_resources').delete().eq('lesson_id', lessonId);
      if (deleteError) throw new Error(`Lỗi cập nhật tài nguyên: ${deleteError.message}`);
      if (resources.length === 0) return [];
      const { data, error } = await supabase
        .from('lesson_resources')
        .insert(resources.map((resource) => ({ ...resource, lesson_id: lessonId })))
        .select();
      if (error) throw new Error(`Lỗi cập nhật tài nguyên: ${error.message}`);
      return (data || []) as DbLessonResource[];
    }
    const retained = localStore.getLessonResources().filter((resource) => resource.lesson_id !== lessonId);
    const created = resources.map((resource, index) => ({
      ...resource,
      id: `resource-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      lesson_id: lessonId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    localStore.setLessonResources([...retained, ...created]);
    return created;
  },

  // ----------------------------------------------------------------------------
  // P0.6 — LEARNER CRUD TRONG CLASS
  // ----------------------------------------------------------------------------

  /**
   * Lấy danh sách học viên trong 1 lớp học hoặc toàn bộ các lớp (nếu classId='ALL' hoặc không truyền)
   */
  async getLearnersInClass(classId?: string): Promise<LearnerInClassDetail[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('enrollments')
          .select(`
            id,
            status,
            joined_at,
            class:classes(department),
            learner:learners(
              id,
              learner_code,
              user:users(id, full_name, email)
            )
          `)
          .order('joined_at', { ascending: true });

        if (classId && classId !== 'ALL') {
          query = query.eq('class_id', classId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[dbService] getLearnersInClass error:', error);
          throw error;
        }

        if (data) {
          return data.map((e: any) => ({
            enrollment_id: e.id,
            learner_id: e.learner?.id,
            user_id: e.learner?.user?.id,
            learner_code: e.learner?.learner_code || 'LRN-000000',
            full_name: e.learner?.user?.full_name || 'Học viên',
            email: e.learner?.user?.email || '',
            department: e.class?.department || 'Ban Nghiệp vụ',
            enrollment_status: e.status,
            joined_at: e.joined_at,
          }));
        }
      } catch (err) {
        console.error('[dbService] Error fetching learners from Supabase:', err);
        throw err;
      }
    }

    // Local fallback store
    const enrollments = (classId && classId !== 'ALL')
      ? localStore.getEnrollments().filter(e => e.class_id === classId)
      : localStore.getEnrollments();
    const learners = localStore.getLearners();
    const users = localStore.getUsers();
    const classes = localStore.getClasses();

    return enrollments.map((e) => {
      const cls = classes.find(c => c.id === e.class_id);
      const learner = learners.find(l => l.id === e.learner_id);
      const user = users.find(u => u.id === learner?.user_id);
      return {
        enrollment_id: e.id,
        learner_id: e.learner_id,
        user_id: user?.id || '',
        learner_code: learner?.learner_code || 'LRN-000000',
        full_name: user?.full_name || 'Học viên',
        email: user?.email || '',
        department: cls?.department || 'Ban Nghiệp vụ',
        enrollment_status: e.status,
        joined_at: e.joined_at || new Date().toISOString(),
      };
    });
  },

  /**
   * Thêm học viên vào lớp (Create Learner in Class):
   * 1. Tìm user theo email
   * 2. Nếu chưa có: tạo user role=learner
   * 3. Tạo learner nếu chưa có, generate LearnerID
   * 4. Tạo enrollment với class hiện tại
   */
  async addLearnerToClass(
    classId: string, 
    data: { fullName: string; email: string }
  ): Promise<{ success: boolean; learner: LearnerInClassDetail }> {
    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName.trim();

    if (isSupabaseConfigured) {
      // 1. Tìm hoặc tạo User
      let user: DbUser;
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        user = existingUser as DbUser;
      } else {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({ email, full_name: fullName, role: 'learner' })
          .select()
          .single();
        if (userError || !newUser) throw new Error(`Lỗi tạo user: ${userError?.message}`);
        user = newUser as DbUser;
      }

      // 2. Tìm hoặc tạo Learner (mã LRN-XXXXXX sinh tự động từ sequence)
      let learner: DbLearner;
      const { data: existingLearner } = await supabase
        .from('learners')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLearner) {
        learner = existingLearner as DbLearner;
      } else {
        const { data: newLearner, error: lError } = await supabase
          .from('learners')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (lError || !newLearner) throw new Error(`Lỗi tạo learner code: ${lError?.message}`);
        learner = newLearner as DbLearner;
      }

      // 3. Tạo hoặc khôi phục Enrollment
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('learner_id', learner.id)
        .eq('class_id', classId)
        .maybeSingle();

      let enrollmentId: string;
      if (existingEnrollment) {
        // Nếu đã từng enroll nhưng bị removed -> active lại
        await supabase
          .from('enrollments')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existingEnrollment.id);
        enrollmentId = existingEnrollment.id;
      } else {
        const { data: newEnrollment, error: eError } = await supabase
          .from('enrollments')
          .insert({
            learner_id: learner.id,
            class_id: classId,
            status: 'active',
          })
          .select()
          .single();
        if (eError || !newEnrollment) throw new Error(`Lỗi ghi danh: ${eError?.message}`);
        enrollmentId = newEnrollment.id;
      }

      const cls = await this.getClassDetail(classId);

      return {
        success: true,
        learner: {
          enrollment_id: enrollmentId,
          learner_id: learner.id,
          user_id: user.id,
          learner_code: learner.learner_code,
          full_name: user.full_name,
          email: user.email,
          department: cls?.department || 'Ban Nghiệp vụ',
          enrollment_status: 'active',
          joined_at: new Date().toISOString(),
        }
      };
    }

    // Local fallback store
    const users = localStore.getUsers();
    let user = users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        email,
        full_name: fullName,
        role: 'learner',
        created_at: new Date().toISOString(),
      };
      users.push(user);
      localStore.setUsers(users);
    }

    const learners = localStore.getLearners();
    let learner = learners.find(l => l.user_id === user!.id);
    if (!learner) {
      learner = {
        id: `learner-${Date.now()}`,
        learner_code: localStore.getNextLearnerCode(),
        user_id: user.id,
        created_at: new Date().toISOString(),
      };
      learners.push(learner);
      localStore.setLearners(learners);
    }

    const enrollments = localStore.getEnrollments();
    let enrollment = enrollments.find(e => e.learner_id === learner!.id && e.class_id === classId);
    if (enrollment) {
      enrollment.status = 'active';
      enrollment.updated_at = new Date().toISOString();
    } else {
      enrollment = {
        id: `enroll-${Date.now()}`,
        learner_id: learner.id,
        class_id: classId,
        status: 'active',
        joined_at: new Date().toISOString(),
      };
      enrollments.push(enrollment);
    }
    localStore.setEnrollments(enrollments);

    const cls = await this.getClassDetail(classId);

    return {
      success: true,
      learner: {
        enrollment_id: enrollment.id,
        learner_id: learner.id,
        user_id: user.id,
        learner_code: learner.learner_code,
        full_name: user.full_name,
        email: user.email,
        department: cls?.department || 'Ban Nghiệp vụ',
        enrollment_status: 'active',
        joined_at: enrollment.joined_at || new Date().toISOString(),
      }
    };
  },

  /**
   * Cập nhật thông tin học viên trong lớp
   */
  async updateLearnerInClass(
    enrollmentId: string, 
    data: { fullName?: string; status?: EnrollmentStatus }
  ): Promise<void> {
    if (isSupabaseConfigured) {
      if (data.status) {
        await supabase
          .from('enrollments')
          .update({ status: data.status, updated_at: new Date().toISOString() })
          .eq('id', enrollmentId);
      }
      if (data.fullName) {
        // Tìm user tương ứng từ enrollment
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('learner:learners(user_id)')
          .eq('id', enrollmentId)
          .single();
        const userId = (enrollment as any)?.learner?.user_id;
        if (userId) {
          await supabase
            .from('users')
            .update({ full_name: data.fullName, updated_at: new Date().toISOString() })
            .eq('id', userId);
        }
      }
      return;
    }

    const enrollments = localStore.getEnrollments();
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    if (!enrollment) return;

    if (data.status) {
      enrollment.status = data.status;
      enrollment.updated_at = new Date().toISOString();
      localStore.setEnrollments(enrollments);
    }

    if (data.fullName) {
      const learners = localStore.getLearners();
      const learner = learners.find(l => l.id === enrollment.learner_id);
      if (learner) {
        const users = localStore.getUsers();
        const user = users.find(u => u.id === learner.user_id);
        if (user) {
          user.full_name = data.fullName;
          localStore.setUsers(users);
        }
      }
    }
  },

  /**
   * Xóa học viên khỏi lớp:
   * KHÔNG xóa users
   * KHÔNG xóa learners
   * Chỉ: enrollment.status = 'removed'
   * Học viên vẫn có thể thuộc lớp khác bình thường.
   */
  async removeLearnerFromClass(enrollmentId: string): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase
        .from('enrollments')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('id', enrollmentId);
      return;
    }

    const enrollments = localStore.getEnrollments();
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    if (enrollment) {
      enrollment.status = 'removed';
      enrollment.updated_at = new Date().toISOString();
      localStore.setEnrollments(enrollments);
    }
  },

  // ----------------------------------------------------------------------------
  // P0.2 & P0.4 — LEARNER VIEW RESOLVER: User -> LearnerID -> Enrollment -> Class
  // ----------------------------------------------------------------------------

  /**
   * Khi Learner đăng nhập:
   * Resolve User -> LearnerID -> Enrollment active -> Class -> Course + Client + Industry
   */
  async getLearnerActiveEnrollment(userId: string): Promise<LearnerActiveEnrollmentView | null> {
    if (isSupabaseConfigured) {
      try {
        // Bước 1: Tìm bản ghi learner ứng với user_id
        const { data: learner, error: lErr } = await supabase
          .from('learners')
          .select('id, learner_code, user:users(*)')
          .eq('user_id', userId)
          .maybeSingle();

        if (lErr || !learner) {
          return null;
        }

        // Bước 2: Tìm enrollment đang active của learner
        const { data: enrollment, error: eErr } = await supabase
          .from('enrollments')
          .select(`
            id,
            learner_id,
            class_id,
            status,
            joined_at,
            class:classes(
              id,
              class_code,
              course_id,
              client_id,
              department,
              start_date,
              end_date,
              status,
              created_at,
              course:courses(*),
              client:clients(*)
            )
          `)
          .eq('learner_id', learner.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!eErr && enrollment && enrollment.class) {
          const cls = enrollment.class as any;
          return {
            user: (learner as any).user,
            learner: { id: learner.id, learner_code: learner.learner_code, user_id: userId },
            enrollment: { 
              id: enrollment.id, 
              learner_id: enrollment.learner_id, 
              class_id: enrollment.class_id, 
              status: enrollment.status,
              joined_at: enrollment.joined_at 
            },
            classDetails: {
              ...cls,
              course: cls.course,
              client: cls.client,
              learner_count: 1,
            },
          };
        }
      } catch (err) {
        console.error('[dbService] Lỗi khi lấy active enrollment:', err);
      }
      return null;
    }

    // Local fallback store
    const users = localStore.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const learners = localStore.getLearners();
    const learner = learners.find(l => l.user_id === user.id);
    if (!learner) return null;

    const enrollments = localStore.getEnrollments();
    const activeEnrollment = enrollments.find(e => e.learner_id === learner.id && e.status === 'active');
    if (!activeEnrollment) return null;

    const classDetails = await this.getClassDetail(activeEnrollment.class_id);
    if (!classDetails) return null;

    return {
      user,
      learner,
      enrollment: activeEnrollment,
      classDetails,
    };
  },

  /**
   * Kiểm tra quyền vào một lớp bằng enrollment thật. Không tạo enrollment cục bộ
   * và không coi việc biết class code là quyền truy cập.
   */
  async canUserAccessClass(userId: string, classId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data: learner, error: learnerError } = await supabase
        .from('learners')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (learnerError || !learner) return false;

      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('learner_id', learner.id)
        .eq('class_id', classId)
        .eq('status', 'active')
        .maybeSingle();
      return !enrollmentError && Boolean(enrollment);
    }

    const learner = localStore.getLearners().find((item) => item.user_id === userId);
    if (!learner) return false;
    return localStore.getEnrollments().some((enrollment) => (
      enrollment.learner_id === learner.id
      && enrollment.class_id === classId
      && enrollment.status === 'active'
    ));
  },

  // ----------------------------------------------------------------------------
  // PROMPT ATTEMPTS PERSISTENCE
  // ----------------------------------------------------------------------------

  /**
   * Lưu một lần chạy prompt thật (V1, V2, ...) vào Supabase hoặc Local fallback
   */
  async recordPromptAttempt(attempt: Omit<DbPromptAttempt, 'id' | 'created_at'>): Promise<DbPromptAttempt> {
    if (isSupabaseConfigured) {
      try {
        let actualLearnerId = attempt.learner_id;
        let actualClassId = attempt.class_id;

        // Auto-resolve learner UUID if passed learner_code or user_id
        if (actualLearnerId.startsWith('LRN-')) {
          const { data: lrn } = await supabase
            .from('learners')
            .select('id')
            .eq('learner_code', actualLearnerId)
            .maybeSingle();
          if (lrn?.id) actualLearnerId = lrn.id;
        }

        // Auto-resolve class UUID if passed class_code
        if (actualClassId.includes('AGRI-') || actualClassId.includes('CORP-')) {
          const { data: cls } = await supabase
            .from('classes')
            .select('id')
            .eq('class_code', actualClassId)
            .maybeSingle();
          if (cls?.id) actualClassId = cls.id;
        }

        const toInsert = {
          ...attempt,
          learner_id: actualLearnerId,
          class_id: actualClassId
        };

        const { data, error } = await supabase
          .from('prompt_attempts')
          .insert(toInsert)
          .select()
          .single();

        if (error) {
          console.error('[dbService] Lỗi ghi nhận prompt_attempts vào Supabase:', error);
          throw new Error(`Lỗi lưu lần thử vào CSDL: ${error.message}`);
        }

        if (data) {
          return data as DbPromptAttempt;
        }
      } catch (err) {
        console.error('[dbService] Exception inserting prompt_attempt:', err);
        throw err instanceof Error ? err : new Error('Lỗi lưu prompt_attempts vào database.');
      }
    }

    const localAttempts = localStore.getPromptAttempts();
    const created: DbPromptAttempt = {
      ...attempt,
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString()
    };
    localAttempts.push(created);
    localStore.setPromptAttempts(localAttempts);
    return created;
  },

  /**
   * Lấy danh sách tất cả các lần thử của học viên trong một lớp và bài lab cụ thể
   */
  async getPromptAttempts(learnerId: string, classId: string, lessonId: string): Promise<DbPromptAttempt[]> {
    if (isSupabaseConfigured) {
      try {
        let actualLearnerId = learnerId;
        let actualClassId = classId;

        if (actualLearnerId.startsWith('LRN-')) {
          const { data: lrn } = await supabase
            .from('learners')
            .select('id')
            .eq('learner_code', actualLearnerId)
            .maybeSingle();
          if (lrn?.id) actualLearnerId = lrn.id;
        }

        if (actualClassId.includes('AGRI-') || actualClassId.includes('CORP-')) {
          const { data: cls } = await supabase
            .from('classes')
            .select('id')
            .eq('class_code', actualClassId)
            .maybeSingle();
          if (cls?.id) actualClassId = cls.id;
        }

        const { data, error } = await supabase
          .from('prompt_attempts')
          .select('*')
          .eq('learner_id', actualLearnerId)
          .eq('class_id', actualClassId)
          .eq('lesson_id', lessonId)
          .order('attempt_number', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as DbPromptAttempt[];
        }
      } catch (err) {
        console.warn('[dbService] Exception getting prompt_attempts:', err);
      }
    }

    const localAttempts = localStore.getPromptAttempts();
    return localAttempts
      .filter(a => (a.learner_id === learnerId || a.learner_id.includes(learnerId)) && (a.class_id === classId || a.class_id.includes(classId)) && a.lesson_id === lessonId)
      .sort((a, b) => a.attempt_number - b.attempt_number);
  },

  /**
   * Cập nhật kết quả đánh giá AI (evaluation_json) cho một lần thử đã lưu
   * Phục vụ chức năng 'Thử đánh giá lại' (Retry Evaluation) khi lần gọi ban đầu gặp sự cố
   */
  async updatePromptAttemptEvaluation(
    attemptId: string, 
    evaluation: AiEvaluationResult | null
  ): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('prompt_attempts')
          .update({ evaluation_json: evaluation })
          .eq('id', attemptId);

        if (error) {
          console.error('[dbService] Supabase update prompt_attempts error:', error);
          throw new Error(`Lỗi cập nhật đánh giá vào CSDL: ${error.message}`);
        }
        return true;
      } catch (err) {
        console.error('[dbService] Exception updating prompt_attempt evaluation:', err);
        throw err;
      }
    }

    const localAttempts = localStore.getPromptAttempts();
    const idx = localAttempts.findIndex(a => a.id === attemptId);
    if (idx !== -1) {
      localAttempts[idx] = {
        ...localAttempts[idx],
        evaluation_json: evaluation
      };
      localStore.setPromptAttempts(localAttempts);
      return true;
    }
    return false;
  },
};


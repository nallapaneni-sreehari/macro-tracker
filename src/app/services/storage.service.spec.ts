import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StorageService } from './storage.service';
import { Storage } from '@ionic/storage-angular';
import { environment } from '../../environments/environment';

// ─── Ionic Storage mock ───────────────────────────────────────────────────────

const localStore: Record<string, any> = {};

const storageMock = {
  create: jasmine.createSpy('create').and.callFake(function (this: any) {
    return Promise.resolve(this);
  }),
  get: jasmine.createSpy('get').and.callFake((key: string) =>
    Promise.resolve(localStore[key] ?? null)
  ),
  set: jasmine.createSpy('set').and.callFake((key: string, value: any) => {
    localStore[key] = value;
    return Promise.resolve();
  }),
  remove: jasmine.createSpy('remove').and.callFake((key: string) => {
    delete localStore[key];
    return Promise.resolve();
  }),
  keys: jasmine.createSpy('keys').and.callFake(() =>
    Promise.resolve(Object.keys(localStore))
  ),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('StorageService', () => {
  let service: StorageService;
  let http: HttpTestingController;
  const apiBase = `${environment.apiUrl}/storage`;

  beforeEach(() => {
    // Reset spies and local store
    Object.keys(localStore).forEach(k => delete localStore[k]);
    Object.values(storageMock).forEach(s => (s as jasmine.Spy).calls.reset());
    storageMock.create.and.callFake(function (this: any) {
      return Promise.resolve(storageMock);
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StorageService,
        { provide: Storage, useValue: storageMock },
      ],
    });

    service = TestBed.inject(StorageService);
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => http.verify());

  // ── getUserEmail / setUserEmail ─────────────────────────────────────────────

  describe('getUserEmail()', () => {
    it('returns null when no email is set', () => {
      expect(service.getUserEmail()).toBeNull();
    });

    it('returns the email after setUserEmail()', fakeAsync(() => {
      service.setUserEmail('User@Example.com');
      tick();
      expect(service.getUserEmail()).toBe('user@example.com');
    }));

    it('normalises email to lowercase', fakeAsync(() => {
      service.setUserEmail('UPPER@CASE.COM');
      tick();
      expect(service.getUserEmail()).toBe('upper@case.com');
    }));

    it('trims whitespace from email', fakeAsync(() => {
      service.setUserEmail('  spaced@email.com  ');
      tick();
      expect(service.getUserEmail()).toBe('spaced@email.com');
    }));
  });

  // ── restoreEmail ───────────────────────────────────────────────────────────

  describe('restoreEmail()', () => {
    it('copies email from Ionic Storage to localStorage when localStorage is empty', async () => {
      localStore['macro_tracker_user_email'] = 'restored@example.com';
      await service.restoreEmail();
      expect(localStorage.getItem('macro_tracker_user_email')).toBe('restored@example.com');
    });

    it('does not overwrite an existing localStorage email', async () => {
      localStorage.setItem('macro_tracker_user_email', 'existing@example.com');
      localStore['macro_tracker_user_email'] = 'other@example.com';
      await service.restoreEmail();
      expect(localStorage.getItem('macro_tracker_user_email')).toBe('existing@example.com');
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('falls back to local storage when no userId is set', async () => {
      localStore['my_key'] = { foo: 'bar' };
      const result = await service.get('my_key');
      expect(result).toEqual({ foo: 'bar' });
      http.expectNone(`${apiBase}`);
    });

    it('fetches from API when userId is set and returns API value', fakeAsync(async () => {
      service.setUserEmail('user@test.com');
      tick();

      const promise = service.get<string>('some_key');
      const req = http.expectOne(`${apiBase}/user%40test.com/some_key`);
      expect(req.request.method).toBe('GET');
      req.flush({ value: 'api-value' });

      const result = await promise;
      expect(result).toBe('api-value');
    }));

    it('falls back to local when API returns null', fakeAsync(async () => {
      service.setUserEmail('user@test.com');
      tick();
      localStore['fallback_key'] = 'local-value';

      const promise = service.get<string>('fallback_key');
      const req = http.expectOne(`${apiBase}/user%40test.com/fallback_key`);
      req.flush({ value: null });

      const result = await promise;
      expect(result).toBe('local-value');
    }));

    it('falls back to local when API throws an error', fakeAsync(async () => {
      service.setUserEmail('user@test.com');
      tick();
      localStore['error_key'] = 'from-local';

      const promise = service.get<string>('error_key');
      const req = http.expectOne(`${apiBase}/user%40test.com/error_key`);
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      const result = await promise;
      expect(result).toBe('from-local');
    }));
  });

  // ── set ────────────────────────────────────────────────────────────────────

  describe('set()', () => {
    it('always writes to local storage', fakeAsync(async () => {
      await service.set('local_only_key', 42);
      tick();
      expect(storageMock.set).toHaveBeenCalledWith('local_only_key', 42);
    }));

    it('also PUTs to API when userId is set', fakeAsync(() => {
      service.setUserEmail('user@test.com');
      tick(); // wait for initLocal() inside setUserEmail to complete

      service.set('goals', { calories: 2000 }); // fire without await
      flushMicrotasks(); // drain initLocal() + storage.set() awaits until HTTP call

      const req = http.expectOne(`${apiBase}/user%40test.com/goals`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ value: { calories: 2000 } });
      req.flush({ success: true });

      flushMicrotasks(); // let set() finish after HTTP response
    }));
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('calls local storage remove when no userId', async () => {
      localStore['del_key'] = 'value';
      await service.remove('del_key');
      expect(storageMock.remove).toHaveBeenCalledWith('del_key');
    });

    it('calls DELETE on API when userId is set', fakeAsync(async () => {
      service.setUserEmail('user@test.com');
      tick();

      const promise = service.remove('del_key');
      const req = http.expectOne(`${apiBase}/user%40test.com/del_key`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      await promise;
    }));
  });
});

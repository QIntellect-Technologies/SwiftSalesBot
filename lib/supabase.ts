/**
 * SQLite Facade for Supabase
 * This shim intercepts Supabase client calls and routes them to the local SQLite API (port 3001).
 * It allows the frontend to stay "as-is" while using a local database.
 */

// Dynamically target port 3001 relative to the current host
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE_URL = `http://${currentHost}:3001/api`;
class SupabaseQueryBuilder {
    constructor(private table: string) { }

    select(columns: string = '*') {
        return {
            order: () => this.select(columns),
            range: () => this.execute('GET'),
            single: () => this.execute('GET').then(res => ({ data: res.data[0], error: res.error })),
            eq: (col: string, val: any) => this.execute('GET', { [col]: val }),
            limit: () => this,
            then: (resolve: any) => this.execute('GET').then(resolve)
        };
    }

    insert(data: any | any[]) {
        return {
            select: () => ({
                single: () => this.execute('POST', data).then(res => ({ data: Array.isArray(res.data) ? res.data[0] : res.data, error: res.error })),
                then: (resolve: any) => this.execute('POST', data).then(resolve)
            }),
            then: (resolve: any) => this.execute('POST', data).then(resolve)
        };
    }

    update(data: any) {
        return {
            eq: (col: string, val: any) => ({
                select: () => ({
                    single: () => this.execute('PUT', data, val).then(res => ({ data: res.data, error: res.error })),
                    then: (resolve: any) => this.execute('PUT', data, val).then(resolve)
                }),
                then: (resolve: any) => this.execute('PUT', data, val).then(resolve)
            }),
            in: (col: string, vals: any[]) => ({
                then: (resolve: any) => this.execute('PUT', { ...data, [col]: vals }, 'bulk').then(resolve)
            })
        };
    }

    delete() {
        return {
            eq: (col: string, val: any) => ({
                then: (resolve: any) => this.execute('DELETE', null, val).then(resolve)
            }),
            in: (col: string, vals: any[]) => ({
                then: (resolve: any) => this.execute('DELETE', { [col]: vals }, 'bulk').then(resolve)
            })
        };
    }

    private async execute(method: string, body: any = null, id: any = null) {
        try {
            let url = `${API_BASE_URL}/${this.table}`;
            if (id && (method === 'PUT' || method === 'DELETE' || method === 'GET')) {
                url += `/${id}`;
            }

            const options: RequestInit = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (body && method !== 'GET') options.body = JSON.stringify(body);

            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) return { data: null, error: { message: data.error || 'API Error' } };
            return { data, error: null };
        } catch (err: any) {
            console.error('Fetch error:', err);
            return { data: null, error: { message: err.message } };
        }
    }
}

export const supabase = {
    from: (table: string) => new SupabaseQueryBuilder(table)
};

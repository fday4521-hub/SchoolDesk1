# SchoolDesk

SchoolDesk is the school portal for Crown Heights Academy: fees, results and notices for parents.

## Database setup (Drizzle ORM + Neon Postgres)

The shared database schema lives in `lib/db/schema.ts`. Migrations are generated into `drizzle/`. Better Auth owns the login and user tables, so this layer does not create them. `parent_students` links a parent's Better Auth user id to a student.

1. Copy the example env file and fill in your own Neon connection string:

   ```bash
   cp .env.example .env
   ```

   Never commit `.env`. Only `.env.example` with placeholders belongs in the repo.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate the migration files from the schema:

   ```bash
   npm run db:generate
   ```

4. Apply the migrations to your Neon database:

   ```bash
   npm run db:migrate
   ```

5. Load the shared sample data (one parent, two children in two classes, three invoices, line items and payments, and two attendance records):

   ```bash
   npm run db:seed
   ```

6. Optional: browse the data:

   ```bash
   npm run db:studio
   ```

The seed is safe to run more than once. It uses fixed ids and skips rows that already exist. The sample parent's Better Auth user id is `sample-parent-user-001`, and the sample teacher id is `demo-teacher-user-001`.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.resolve(__dirname, '../scripts/restore.sh');
const backupScript = path.resolve(__dirname, '../scripts/backup.sh');
const gitBash = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe');
const shell = process.platform === 'win32' && fs.existsSync(gitBash) ? gitBash : 'bash';

describe('PostgreSQL backup and restore scripts', () => {
  let directory;
  let commandLog;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reservorio-restore-'));
    commandLog = path.join(directory, 'commands.log');
    fs.writeFileSync(
      path.join(directory, 'pg_restore'),
      [
        '#!/bin/sh',
        'printf "%s\\n" "$*" >> "$COMMAND_LOG"',
        'case "$*" in',
        '  *--list*) [ "${PREFLIGHT_FAIL:-0}" != 1 ] || exit 8 ;;',
        '  *) [ "${RESTORE_FAIL:-0}" != 1 ] || exit 9 ;;',
        'esac',
        '',
      ].join('\n'),
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(directory, 'psql'),
      [
        '#!/bin/sh',
        'printf "%s\\n" "$*" >> "$COMMAND_LOG"',
        'case "$*" in *"SELECT current_database()"*) printf "%s" "$DB_NAME" ;; esac',
        '',
      ].join('\n'),
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(directory, 'pg_dump'),
      [
        '#!/bin/sh',
        'printf "%s\\n" "$*" >> "$PG_DUMP_LOG"',
        'for arg do case "$arg" in --file=*) output=${arg#--file=} ;; esac; done',
        '[ -n "${output:-}" ] && printf "fixture" > "$output"',
        '[ "${PG_DUMP_FAIL:-0}" != 1 ] || exit 9',
        '',
      ].join('\n'),
      { mode: 0o755 }
    );
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  function restore(filename, extraEnv = {}) {
    const dump = path.join(directory, filename);
    fs.writeFileSync(dump, 'fixture');

    return spawnSync(shell, [script, dump], {
      encoding: 'utf8',
      input: 'yes\n',
      env: {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH}`,
        COMMAND_LOG: commandLog,
        DB_NAME: 'reservorio_test',
        RESTORE_DATABASE_URL: 'postgres://reservorio_test:secret@127.0.0.1:5432/reservorio_test',
        MAINTENANCE_DATABASE_URL: 'postgres://reservorio_test:secret@127.0.0.1:5432/postgres',
        ...extraEnv,
      },
    });
  }

  test('writes atomic custom-format dumps compatible with pg_restore', () => {
    const backupDirectory = path.join(directory, 'backups');
    const dumpLog = path.join(directory, 'pg_dump.log');
    const result = spawnSync(shell, [backupScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH}`,
        PG_DUMP_LOG: dumpLog,
        DATABASE_URL: 'postgres://test',
        BACKUP_DIR: backupDirectory,
        RETENTION: '14',
      },
    });

    expect(result.status).toBe(0);
    expect(fs.readFileSync(dumpLog, 'utf8')).toContain('--format=custom');
    expect(fs.readdirSync(backupDirectory)).toEqual([expect.stringMatching(/\.dump$/)]);
  });

  test('removes partial dumps when pg_dump fails', () => {
    const backupDirectory = path.join(directory, 'backups');
    const result = spawnSync(shell, [backupScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH}`,
        PG_DUMP_LOG: path.join(directory, 'pg_dump.log'),
        PG_DUMP_FAIL: '1',
        DATABASE_URL: 'postgres://test',
        BACKUP_DIR: backupDirectory,
        RETENTION: '14',
      },
    });

    expect(result.status).not.toBe(0);
    expect(fs.readdirSync(backupDirectory)).toEqual([]);
  });

  test('reports pg_restore failures and returns a failing status', () => {
    const result = restore('backup.dump', { RESTORE_FAIL: '1' });

    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(commandLog, 'utf8')).toContain('--exit-on-error');
  });

  test('rejects invalid archives before dropping the target database', () => {
    const result = restore('invalid.dump', { PREFLIGHT_FAIL: '1' });
    const calls = fs.readFileSync(commandLog, 'utf8');

    expect(result.status).not.toBe(0);
    expect(calls).not.toContain('DROP DATABASE');
  });

  test('restores custom dumps and reports critical table counts', () => {
    const result = restore('backup.dump');
    const calls = fs.readFileSync(commandLog, 'utf8');

    expect(result.status).toBe(0);
    expect(calls).toContain(
      '--dbname=postgres://reservorio_test:secret@127.0.0.1:5432/reservorio_test --exit-on-error'
    );
    expect(calls).toContain("'customers='");
    expect(calls).toContain("'reservations='");
    expect(calls).toContain("'payments='");
  });

  test('restores plain SQL backups with psql', () => {
    const result = restore('backup.sql');

    expect(result.status).toBe(0);
    expect(fs.readFileSync(commandLog, 'utf8')).toContain(
      'postgres://reservorio_test:secret@127.0.0.1:5432/reservorio_test -X --set ON_ERROR_STOP=on'
    );
  });
});

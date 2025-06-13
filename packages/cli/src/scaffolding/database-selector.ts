import {
  DatabaseProvider,
  DatabaseType,
  DatabaseConfig,
  DatabaseFeature,
} from "@farm-framework/types";
import { logger } from "../utils/logger.js";

export class DatabaseSelector {
  private providers: Map<DatabaseType, DatabaseProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const mongo: DatabaseProvider = {
      type: "mongodb",
      connectionUrl: "mongodb://farm:farm123@localhost:27017/farmapp",
      dependencies: {
        python: ["beanie>=1.24.0", "motor>=3.3.2", "pymongo>=4.6.0"],
      },
      dockerConfig: {
        image: "mongo:7-jammy",
        environment: {
          MONGO_INITDB_ROOT_USERNAME: "farm",
          MONGO_INITDB_ROOT_PASSWORD: "farm123",
          MONGO_INITDB_DATABASE: "farmapp",
        },
        ports: ["27017:27017"],
        volumes: ["mongodb_data:/data/db"],
        healthCheck: {
          test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"],
          interval: "30s",
          timeout: "10s",
          retries: 3,
        },
      },
      templateConfig: {
        baseConfigFile: "database/mongodb.py",
        modelBaseClass: "Document",
        migrationSupport: false,
        features: ["json", "arrays", "fulltext"],
      },
    };

    const postgres: DatabaseProvider = {
      type: "postgresql",
      connectionUrl: "postgresql://farm:farm123@localhost:5432/farmapp",
      dependencies: {
        python: [
          "sqlmodel>=0.0.14",
          "asyncpg>=0.29.0",
          "alembic>=1.13.0",
          "psycopg2-binary>=2.9.9",
        ],
      },
      dockerConfig: {
        image: "postgres:16-alpine",
        environment: {
          POSTGRES_DB: "farmapp",
          POSTGRES_USER: "farm",
          POSTGRES_PASSWORD: "farm123",
          PGDATA: "/var/lib/postgresql/data/pgdata",
        },
        ports: ["5432:5432"],
        volumes: ["postgres_data:/var/lib/postgresql/data"],
        healthCheck: {
          test: ["CMD-SHELL", "pg_isready -U farm -d farmapp"],
          interval: "30s",
          timeout: "10s",
          retries: 3,
        },
      },
      templateConfig: {
        baseConfigFile: "database/postgresql.py",
        modelBaseClass: "SQLModel",
        migrationSupport: true,
        features: ["transactions", "relations", "json", "fulltext"],
      },
    };
    const mysql: DatabaseProvider = {
      type: "mysql",
      connectionUrl: "mysql://farm:farm123@localhost:3306/farmapp",
      dependencies: {
        python: [
          "sqlmodel>=0.0.14",
          "aiomysql>=0.2.0",
          "alembic>=1.13.0",
          "PyMySQL>=1.1.0",
        ],
      },
      dockerConfig: {
        image: "mysql:8.0",
        environment: {
          MYSQL_DATABASE: "farmapp",
          MYSQL_USER: "farm",
          MYSQL_PASSWORD: "farm123",
          MYSQL_ROOT_PASSWORD: "rootpass123",
        },
        ports: ["3306:3306"],
        volumes: ["mysql_data:/var/lib/mysql"],
        healthCheck: {
          test: ["CMD", "mysqladmin", "ping", "-h", "localhost"],
          interval: "30s",
          timeout: "10s",
          retries: 3,
        },
      },
      templateConfig: {
        baseConfigFile: "database/mysql.py",
        modelBaseClass: "SQLModel",
        migrationSupport: true,
        features: ["transactions", "relations", "json", "fulltext"],
      },
    };

    const sqlite: DatabaseProvider = {
      type: "sqlite",
      connectionUrl: "sqlite:///./farmapp.db",
      dependencies: {
        python: ["sqlmodel>=0.0.14", "aiosqlite>=0.19.0", "alembic>=1.13.0"],
      },
      dockerConfig: {
        image: "",
        environment: {},
        ports: [],
        volumes: ["./data:/app/data"],
      },
      templateConfig: {
        baseConfigFile: "database/sqlite.py",
        modelBaseClass: "SQLModel",
        migrationSupport: true,
        features: ["transactions", "relations", "json"],
      },
    };

    const sqlserver: DatabaseProvider = {
      type: "sqlserver",
      connectionUrl:
        "mssql+pyodbc://farm:Farm123!@localhost:1433/farmapp?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes",
      dependencies: {
        python: [
          "sqlmodel>=0.0.14",
          "aioodbc>=0.4.0",
          "pyodbc>=5.0.1",
          "alembic>=1.13.0",
        ],
      },
      dockerConfig: {
        image: "mcr.microsoft.com/mssql/server:2022-latest",
        environment: {
          ACCEPT_EULA: "Y",
          MSSQL_SA_PASSWORD: "Farm123!Strong",
          MSSQL_PID: "Developer",
        },
        ports: ["1433:1433"],
        volumes: ["sqlserver_data:/var/opt/mssql"],
        healthCheck: {
          test: [
            "CMD-SHELL",
            "/opt/mssql-tools/bin/sqlcmd -S localhost -U SA -P 'Farm123!Strong' -Q 'SELECT 1'",
          ],
          interval: "30s",
          timeout: "10s",
          retries: 3,
        },
      },
      templateConfig: {
        baseConfigFile: "database/sqlserver.py",
        modelBaseClass: "SQLModel",
        migrationSupport: true,
        features: ["transactions", "relations", "json", "fulltext"],
      },
    };

    this.providers.set("mongodb", mongo);
    this.providers.set("postgresql", postgres);
    this.providers.set("mysql", mysql);
    this.providers.set("sqlite", sqlite);
    this.providers.set("sqlserver", sqlserver);
  }

  getSupportedDatabases(): DatabaseType[] {
    return Array.from(this.providers.keys());
  }

  async selectDatabase(type: DatabaseType): Promise<DatabaseProvider> {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Unsupported database type: ${type}`);
    }
    logger.info(`Selected database provider: ${type}`);
    return provider;
  }

  /**
   * Validate a database configuration object
   */
  async validateDatabaseConfig(config: DatabaseConfig): Promise<boolean> {
    const provider = await this.selectDatabase(config.type);

    if (!this.isValidConnectionUrl(config.url, config.type)) {
      throw new Error(`Invalid connection URL for ${config.type}`);
    }

    if (provider.templateConfig.migrationSupport && !config.migrations) {
      logger.warn(
        `Migration config missing for ${config.type}; using defaults`
      );
    }

    return true;
  }

  /**
   * Get features supported by a database provider
   */
  getDatabaseFeatures(type: DatabaseType): DatabaseFeature[] {
    return this.providers.get(type)?.templateConfig.features ?? [];
  }
  private isValidConnectionUrl(url: string, type: DatabaseType): boolean {
    const patterns: Record<DatabaseType, RegExp> = {
      mongodb: /^mongodb:\/\/.+/,
      postgresql: /^postgresql:\/\/.+/,
      mysql: /^mysql:\/\/.+/,
      sqlite: /^sqlite:\/\/.+/,
      sqlserver: /^mssql\+pyodbc:\/\/.+/,
    };

    return patterns[type]?.test(url) || false;
  }
}

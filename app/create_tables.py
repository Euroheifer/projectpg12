import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
import models


models.Base.metadata.create_all(bind=engine)

# engine = create_engine("postgresql+psycopg2://postgres:postgres@db:5432/project_pg12")


# models.Base.metadata.create_all(bind=engine)
# print("Existing tables checked, new tables created if missing.")

# add new row
# inspector = inspect(engine)

# with engine.connect() as conn:
#     for table_name, model_class in [("groups", models.Group)]:
#         existing_columns = [col["name"] for col in inspector.get_columns(table_name)]
#         for column in model_class.__table__.columns:
#             if column.name not in existing_columns:
#                 
#                 alter_sql = f'ALTER TABLE {table_name} ADD COLUMN {column.name} {column.type}'
#                 if column.default is not None:
#                     alter_sql += f' DEFAULT {column.default.arg}'
#                 conn.execute(alter_sql)
#                 print(f"Added missing column '{column.name}' to table '{table_name}'")

# print("Missing columns added successfully.")




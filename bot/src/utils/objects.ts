export const mergeObjects = (orig: any, source: any) => {
  const dest = {};
  let isModified = false;

  Object.keys(source)
    .sort()
    .forEach((key) => {
      if (!(key in orig)) {
        isModified = true;
        dest[key] = source[key];
      } else {
        dest[key] = orig[key];
      }
    });

  return [dest, isModified];
};

export const splitObjects = (desination: any, source: any) => {
  const dest = Object.assign({}, desination);
  let isModified = false;

  Object.keys(dest).forEach((key) => {
    if (!(key in source)) {
      isModified = true;
      delete dest[key];
    }
  });

  return [dest, isModified];
};

/*

CREATE FUNCTION sort_json_object(json_obj json)
RETURNS jsonb
AS $$
    SELECT jsonb_object(array_agg(key_value_pairs))
    FROM (
        SELECT array_to_string(array_agg(to_json(key_value_pairs)), ',') AS key_value_pairs
        FROM (
            SELECT *
            FROM json_each(json_obj)
            ORDER BY key
        ) sorted
    ) key_value_pairs
$$ LANGUAGE sql IMMUTABLE;

INSERT INTO my_table (id, my_jsonb_col)
VALUES (1, sort_json_object('{"c": 3, "a": 1, "b": 2}'::json));

*/

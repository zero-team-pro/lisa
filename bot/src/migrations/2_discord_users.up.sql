CREATE
OR REPLACE FUNCTION uuid_generate_v7 () RETURNS uuid AS $$
BEGIN
  -- use random v4 uuid as starting point (which has the same variant we need)
  -- then overlay timestamp
  -- then set version 7 by flipping the 2 and 1 bit in the version 4 string
  RETURN ENCODE(
      SET_BIT(
          SET_BIT(
              OVERLAY(uuid_send(gen_random_uuid())
                      PLACING
                                        SUBSTRING(int8send(FLOOR(EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::bigint) FROM
                                3)
                      FROM 1 FOR 6
              ),
              52, 1
          ),
          53, 1
      ),
      'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;

ALTER TABLE public.user
RENAME TO discord_user;

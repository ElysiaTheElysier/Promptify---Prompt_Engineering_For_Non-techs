-- Run only inside a rollback transaction, alongside migration 044.
CREATE FUNCTION public.qa_reject_policy_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.action='cohort.lifecycle' AND NEW.reason='QA atomic audit failure' THEN RAISE EXCEPTION 'QA forced audit failure'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER qa_reject_policy_audit BEFORE INSERT ON public.product_audit FOR EACH ROW EXECUTE FUNCTION public.qa_reject_policy_audit();
DO $$ DECLARE cohort uuid; subject text; prior text; caught boolean:=false; BEGIN
 SELECT id,status INTO STRICT cohort,prior FROM public.classes WHERE class_code='QA-PRODUCTION-classA';
 SELECT auth_provider_id INTO STRICT subject FROM public.users WHERE email='duonglh.work@gmail.com';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
 BEGIN PERFORM public.product_save_class(cohort,CASE WHEN prior='active' THEN 'upcoming' ELSE 'active' END,'QA atomic audit failure');
 EXCEPTION WHEN OTHERS THEN caught:=true;END;
 IF NOT caught OR (SELECT status FROM public.classes WHERE id=cohort) IS DISTINCT FROM prior THEN RAISE EXCEPTION 'Lifecycle mutation survived failed audit'; END IF;
 caught:=false;BEGIN PERFORM public.product_save_class(cohort,'invalid','QA');EXCEPTION WHEN OTHERS THEN caught:=true;END;
 IF NOT caught THEN RAISE EXCEPTION 'Invalid lifecycle accepted';END IF;
 PERFORM public.product_save_domain(cohort,'qa-trial.invalid',true);
 IF NOT EXISTS(SELECT 1 FROM public.product_audit WHERE class_id=cohort AND action='domain.policy' AND reason='qa-trial.invalid / active') THEN RAISE EXCEPTION 'Domain policy missing audit'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 caught:=false;BEGIN PERFORM public.product_save_class(cohort,'active','QA unauthorized');EXCEPTION WHEN OTHERS THEN caught:=true;END;
 IF NOT caught THEN RAISE EXCEPTION 'Unauthorized lifecycle accepted';END IF;
END $$;
DROP TRIGGER qa_reject_policy_audit ON public.product_audit;
DROP FUNCTION public.qa_reject_policy_audit();

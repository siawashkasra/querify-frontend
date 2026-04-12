.PHONY: dev build lint typecheck e2e e2e-headed e2e-debug

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

typecheck:
	npx tsc --noEmit

e2e:
	npx playwright test --reporter=list

e2e-headed:
	npx playwright test --headed

e2e-debug:
	npx playwright test --debug

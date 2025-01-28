                <Anchor
                  href={`/Patient/${patient.id}`}
                  style={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {getDisplayString(patient)}
                </Anchor> 